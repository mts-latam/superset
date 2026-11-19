/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useCallback,
  Ref,
  useState,
} from 'react';
import { useSelector } from 'react-redux';

import { styled, useTheme } from '@apache-superset/core/theme';
import { use, init, EChartsType, registerLocale } from 'echarts/core';
import {
  SankeyChart,
  PieChart,
  BarChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  LineChart,
  ScatterChart,
  RadarChart,
  BoxplotChart,
  TreeChart,
  TreemapChart,
  HeatmapChart,
  SunburstChart,
  CustomChart,
} from 'echarts/charts';
import { SVGRenderer } from 'echarts/renderers';
import {
  TooltipComponent,
  TitleComponent,
  GridComponent,
  VisualMapComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  GraphicComponent,
  AriaComponent,
  MarkAreaComponent,
  MarkLineComponent,
} from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { EchartsHandler, EchartsProps, EchartsStylesProps } from '../types';
import { DEFAULT_LOCALE } from '../constants';
import { mergeEchartsThemeOverrides } from '../utils/themeOverrides';

// Define this interface here to avoid creating a dependency back to superset-frontend,
// TODO: to move the type to @superset-ui/core
interface ExplorePageState {
  common?: {
    locale?: string;
  };
  dashboardState?: {
    isRefreshing?: boolean;
  };
}

const Styles = styled.div<EchartsStylesProps>`
  height: ${({ height }) => height};
  width: ${({ width }) => width};
`;

// eslint-disable-next-line react-hooks/rules-of-hooks -- This is ECharts' use function, not a React hook
use([
  SVGRenderer,
  BarChart,
  BoxplotChart,
  CustomChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreeChart,
  TreemapChart,
  AriaComponent,
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  TitleComponent,
  VisualMapComponent,
  LabelLayout,
]);

const loadLocale = async (locale: string) => {
  let lang;
  try {
    lang = await import(`echarts/lib/i18n/lang${locale}`);
  } catch {
    // Locale not supported in ECharts
  }
  return lang?.default;
};

// ---------------------------------------------------------------------------
// Etiquetas de valores personalizadas (MTS)
// ---------------------------------------------------------------------------

// Tipos de serie a los que se les fuerzan las etiquetas. Las áreas de Superset
// son series 'line' con areaStyle, así que quedan incluidas. Pie, gauge,
// sankey, etc. se dejan con su comportamiento original.
const LABELED_SERIES_TYPES = new Set(['line']);

// La 1ª serie lleva la etiqueta arriba del punto y la 2ª abajo, para que
// cuando los valores son parecidos (presupuesto vs. ejecución) no se tapen.
const LABEL_POSITIONS = ['top', 'bottom'] as const;

// Un punto a menos de este % del rango del eje Y se considera "pegado" al eje X.
const NEAR_AXIS_BOTTOM_RATIO = 0.08;

// Espacio extra a los lados del eje X para que la primera y la última
// etiqueta no choquen con el eje Y ni se corten en el borde derecho.
const X_AXIS_SIDE_GAP = '5%';

// Espacio extra arriba del valor máximo para que la etiqueta más alta
// no toque la leyenda.
const Y_AXIS_TOP_GAP = '15%';

const padXAxis = (axis: any) => {
  if (!axis || typeof axis !== 'object') return axis;
  // Si el usuario fijó límites en el eje, se respetan.
  const hasFixedBounds =
    (axis.min !== undefined && axis.min !== null) ||
    (axis.max !== undefined && axis.max !== null);
  if (axis.type === 'category') return { ...axis, boundaryGap: true };
  if (hasFixedBounds) return axis;
  return { ...axis, boundaryGap: [X_AXIS_SIDE_GAP, X_AXIS_SIDE_GAP] };
};

const padYAxis = (axis: any) => {
  if (!axis || typeof axis !== 'object' || axis.type === 'category') {
    return axis;
  }
  // Con un máximo fijo (límites del eje en Superset) no se toca.
  if (axis.max !== undefined && axis.max !== null) return axis;
  const currentGap = Array.isArray(axis.boundaryGap) ? axis.boundaryGap : [];
  return {
    ...axis,
    // ECharts no aplica el margen inferior si el eje tiene min fijo (p. ej. 0),
    // así que esto solo agrega aire arriba.
    boundaryGap: [currentGap[0] ?? 0, Y_AXIS_TOP_GAP],
  };
};

const mapAxis = (axis: any, fn: (a: any) => any) =>
  Array.isArray(axis) ? axis.map(fn) : fn(axis);

const applyAxisPadding = (options: any) => {
  const seriesList: any[] = Array.isArray(options?.series)
    ? options.series
    : [options?.series];
  const hasLabeledSeries = seriesList.some(
    s => s && LABELED_SERIES_TYPES.has(s.type),
  );
  if (!hasLabeledSeries) return;
  // eslint-disable-next-line no-param-reassign
  options.xAxis = mapAxis(options.xAxis, padXAxis);
  // eslint-disable-next-line no-param-reassign
  options.yAxis = mapAxis(options.yAxis, padYAxis);
};

// Color real de la serie (Superset lo define en itemStyle/lineStyle).
const getSeriesColor = (series: any): string | undefined => {
  const color =
    series?.itemStyle?.color ?? series?.lineStyle?.color ?? series?.color;
  return typeof color === 'string' ? color : undefined;
};

// Texto blanco sobre colores oscuros y oscuro sobre colores claros.
const getContrastTextColor = (color?: string): string => {
  if (!color) return '#ffffff';
  let hex = color.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#1f2937' : '#ffffff';
};

// Extrae [x, y] de un punto, venga como [x, y], { value: [x, y] } o número.
const getPointXY = (
  point: any,
  index: number,
): { x: string; y: number | null } => {
  const raw =
    point && typeof point === 'object' && !Array.isArray(point)
      ? point.value
      : point;
  if (Array.isArray(raw)) {
    const y = raw[1];
    return {
      x: String(raw[0]),
      y: typeof y === 'number' && Number.isFinite(y) ? y : null,
    };
  }
  return {
    x: String(index),
    y: typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
  };
};

// Para cada valor de X decide qué serie va arriba y cuál abajo: la serie con
// el valor más alto en ese punto lleva la etiqueta encima y la más baja debajo,
// así nunca se cruzan aunque las series se intercambien de posición.
const computePointPositions = (
  labeled: { series: any; seriesIdx: number }[],
): Map<number, (string | undefined)[]> => {
  const result = new Map<number, (string | undefined)[]>();
  const byX = new Map<
    string,
    { seriesIdx: number; pointIdx: number; y: number }[]
  >();

  labeled.forEach(({ series, seriesIdx }) => {
    const data: any[] = Array.isArray(series.data) ? series.data : [];
    result.set(seriesIdx, new Array(data.length).fill(undefined));
    data.forEach((point, pointIdx) => {
      const { x, y } = getPointXY(point, pointIdx);
      if (y === null) return;
      if (!byX.has(x)) byX.set(x, []);
      byX.get(x)!.push({ seriesIdx, pointIdx, y });
    });
  });

  // Rango vertical aproximado del eje Y, para detectar puntos pegados al eje X
  const allY: number[] = [];
  byX.forEach(points => points.forEach(p => allY.push(p.y)));
  const axisBottom = Math.min(0, ...allY);
  const axisRange = Math.max(...allY, 0) - axisBottom || 1;
  const isNearAxisBottom = (y: number) =>
    (y - axisBottom) / axisRange < NEAR_AXIS_BOTTOM_RATIO;

  byX.forEach(points => {
    if (points.length < 2) {
      points.forEach(p => {
        result.get(p.seriesIdx)![p.pointIdx] = 'top';
      });
      return;
    }
    // Orden estable: mayor valor primero; en empate respeta el orden de series
    const sorted = [...points].sort(
      (a, b) => b.y - a.y || a.seriesIdx - b.seriesIdx,
    );
    sorted.forEach((p, i) => {
      let position = 'right';
      if (i === 0) position = 'top';
      else if (i === sorted.length - 1) {
        // Si el punto está pegado al eje X, la etiqueta debajo invadiría las
        // fechas del eje: se pone a la derecha del punto.
        position = isNearAxisBottom(p.y) ? 'right' : 'bottom';
      }
      result.get(p.seriesIdx)![p.pointIdx] = position;
    });
  });

  return result;
};

// Aplica la posición calculada a cada punto (la etiqueta del punto
// sobrescribe la de la serie).
const withPointPositions = (data: any, positions?: (string | undefined)[]) => {
  if (!Array.isArray(data) || !positions) return data;
  return data.map((point, i) => {
    const position = positions[i];
    if (!position || point === null || point === undefined) return point;
    if (typeof point === 'object' && !Array.isArray(point)) {
      return { ...point, label: { ...(point.label || {}), position } };
    }
    return { value: point, label: { position } };
  });
};

const applyValueLabels = (options: any) => {
  const rawSeries = options?.series;
  if (!rawSeries) return;

  const isArray = Array.isArray(rawSeries);
  const seriesList: any[] = isArray ? rawSeries : [rawSeries];

  const isLabeled = (series: any) =>
    series &&
    LABELED_SERIES_TYPES.has(series.type) &&
    // Series auxiliares invisibles (p. ej. bandas de confianza del forecast)
    series.lineStyle?.opacity !== 0;

  const labeled = seriesList
    .map((series, seriesIdx) => ({ series, seriesIdx }))
    .filter(({ series }) => isLabeled(series));

  // En series apiladas el valor crudo no indica cuál va más arriba en
  // pantalla, así que ahí todas las etiquetas van encima de su punto.
  const isStacked = labeled.some(({ series }) => Boolean(series.stack));
  const pointPositions = isStacked
    ? new Map<number, (string | undefined)[]>()
    : computePointPositions(labeled);

  let labeledIndex = 0;

  const newSeries = seriesList.map((series, seriesIdx) => {
    if (!isLabeled(series)) return series;

    const seriesColor = getSeriesColor(series);
    // 'auto' hace que ECharts use el color visual de la serie si no lo encontramos
    const background = seriesColor ?? 'auto';
    // Posición por defecto (se usa si no hay datos por punto o en apiladas)
    const position = isStacked
      ? 'top'
      : LABEL_POSITIONS[labeledIndex % LABEL_POSITIONS.length];
    labeledIndex += 1;

    return {
      ...series,
      data: withPointPositions(series.data, pointPositions.get(seriesIdx)),
      // Sin símbolo visible ECharts no dibuja la etiqueta, y con muchos puntos
      // los omite por defecto: se fuerzan todos.
      showSymbol: true,
      showAllSymbol: true,
      label: {
        // conserva el formatter de Superset (B, M, separadores de miles, etc.)
        ...(series.label || {}),
        show: true,
        position,
        distance: 8,
        backgroundColor: background,
        borderColor: background,
        borderWidth: 0,
        borderRadius: 4,
        padding: [3, 6],
        color: getContrastTextColor(seriesColor),
        fontSize: 10,
        fontWeight: 'bold',
      },
      // No ocultar etiquetas aunque se solapen
      labelLayout: { hideOverlap: false },
    };
  });

  // eslint-disable-next-line no-param-reassign
  options.series = isArray ? newSeries : newSeries[0];
};

function Echart(
  {
    width,
    height,
    echartOptions,
    eventHandlers,
    zrEventHandlers,
    selectedValues = {},
    refs,
    vizType,
  }: EchartsProps,
  ref: Ref<EchartsHandler>,
) {
  const theme = useTheme();
  const divRef = useRef<HTMLDivElement>(null);
  if (refs) {
    // eslint-disable-next-line no-param-reassign
    refs.divRef = divRef;
  }
  const [didMount, setDidMount] = useState(false);
  const chartRef = useRef<EChartsType>();
  const currentSelection = useMemo(
    () => Object.keys(selectedValues) || [],
    [selectedValues],
  );
  const previousSelection = useRef<string[]>([]);

  useImperativeHandle(ref, () => ({
    getEchartInstance: () => chartRef.current,
  }));

  const locale = useSelector(
    (state: ExplorePageState) => state?.common?.locale ?? DEFAULT_LOCALE,
  ).toUpperCase();
  const isDashboardRefreshing = useSelector((state: ExplorePageState) =>
    Boolean(state?.dashboardState?.isRefreshing),
  );

  const handleSizeChange = useCallback(
    ({ width, height }: { width: number; height: number }) => {
      if (chartRef.current) {
        chartRef.current.resize({ width, height });
      }
    },
    [],
  );

  useEffect(() => {
    loadLocale(locale).then(localeObj => {
      if (localeObj) {
        registerLocale(locale, localeObj);
      }
      if (!divRef.current) return;
      if (!chartRef.current) {
        chartRef.current = init(divRef.current, null, { locale });
      }
      // did mount
      handleSizeChange({ width, height });
      setDidMount(true);
    });
  }, [locale, width, height, handleSizeChange]);

  useEffect(() => {
    if (didMount) {
      Object.entries(eventHandlers || {}).forEach(([name, handler]) => {
        chartRef.current?.off(name);
        chartRef.current?.on(name, handler);
      });

      Object.entries(zrEventHandlers || {}).forEach(([name, handler]) => {
        chartRef.current?.getZr().off(name);
        chartRef.current?.getZr().on(name, handler);
      });

      const getEchartsTheme = (options: any) => {
        const antdTheme = theme;
        const echartsTheme = {
          textStyle: {
            color: antdTheme.colorText,
            fontFamily: antdTheme.fontFamily,
          },
          title: {
            textStyle: { color: antdTheme.colorText },
          },
          legend: {
            textStyle: { color: antdTheme.colorTextSecondary },
            pageTextStyle: {
              color: antdTheme.colorTextSecondary,
            },
            pageIconColor: antdTheme.colorTextSecondary,
            pageIconInactiveColor: antdTheme.colorTextDisabled,
            inactiveColor: antdTheme.colorTextDisabled,
          },
          tooltip: {
            backgroundColor: antdTheme.colorBgContainer,
            textStyle: { color: antdTheme.colorText },
          },
          axisPointer: {
            lineStyle: { color: antdTheme.colorPrimary },
            label: { color: antdTheme.colorText },
          },
        } as any;
        if (options?.xAxis) {
          echartsTheme.xAxis = {
            axisLine: { lineStyle: { color: antdTheme.colorSplit } },
            axisLabel: { color: antdTheme.colorTextSecondary },
            splitLine: { lineStyle: { color: antdTheme.colorSplit } },
            minorSplitLine: {
              lineStyle: { color: antdTheme.colorBorderSecondary },
            },
          };
        }
        if (options?.yAxis) {
          echartsTheme.yAxis = {
            axisLine: { lineStyle: { color: antdTheme.colorSplit } },
            axisLabel: { color: antdTheme.colorTextSecondary },
            splitLine: { lineStyle: { color: antdTheme.colorSplit } },
            minorSplitLine: {
              lineStyle: { color: antdTheme.colorBorderSecondary },
            },
          };
        }
        return echartsTheme;
      };

      const baseTheme = getEchartsTheme(echartOptions);
      const globalOverrides = theme.echartsOptionsOverrides || {};
      const chartOverrides = vizType
        ? theme.echartsOptionsOverridesByChartType?.[vizType] || {}
        : {};

      // Disable animations during auto-refresh to reduce visual noise
      const animationOverride = isDashboardRefreshing
        ? {
          animation: false,
          animationDuration: 0,
        }
        : {};

      const themedEchartOptions = mergeEchartsThemeOverrides(
        baseTheme,
        echartOptions,
        globalOverrides,
        chartOverrides,
        animationOverride,
      );

      // Etiquetas siempre visibles y con el color de cada serie
      applyValueLabels(themedEchartOptions);
      // Margen en los ejes para que las etiquetas no se salgan del gráfico
      applyAxisPadding(themedEchartOptions);

      const notMerge = !isDashboardRefreshing;
      chartRef.current?.dispatchAction({ type: 'hideTip' });
      chartRef.current?.setOption(themedEchartOptions, {
        notMerge,
        replaceMerge: notMerge ? undefined : ['series'],
        // lazyUpdate defers render, causing tooltip crashes on stale shapes (#39247)
        lazyUpdate: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isDashboardRefreshing intentionally excluded to prevent extra setOption calls
  }, [didMount, echartOptions, eventHandlers, zrEventHandlers, theme, vizType]);

  // Clear tooltip on refresh start to avoid stale content (#39247)
  useEffect(() => {
    if (didMount && isDashboardRefreshing && chartRef.current) {
      chartRef.current.dispatchAction({ type: 'hideTip' });
      chartRef.current.dispatchAction({
        type: 'updateAxisPointer',
        currTrigger: 'leave',
      });
    }
  }, [didMount, isDashboardRefreshing]);

  useEffect(() => () => chartRef.current?.dispose(), []);

  // highlighting
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.dispatchAction({
      type: 'downplay',
      dataIndex: previousSelection.current.filter(
        value => !currentSelection.includes(value),
      ),
    });
    if (currentSelection.length) {
      chartRef.current.dispatchAction({
        type: 'highlight',
        dataIndex: currentSelection,
      });
    }
    previousSelection.current = currentSelection;
  }, [currentSelection]);

  useLayoutEffect(() => {
    handleSizeChange({ width, height });
  }, [width, height, handleSizeChange]);

  return <Styles ref={divRef} height={height} width={width} />;
}

export default forwardRef(Echart);
