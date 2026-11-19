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
  createDurationFormatter,
  getNumberFormatter,
  getNumberFormatterRegistry,
  NumberFormats,
  getTimeFormatterRegistry,
  SMART_DATE_ID,
  SMART_DATE_DETAILED_ID,
  SMART_DATE_VERBOSE_ID,
  createSmartDateFormatter,
  createSmartDateVerboseFormatter,
  createSmartDateDetailedFormatter,
  createMemoryFormatter,
  NumberFormatter,
} from '@superset-ui/core';
import { FormatLocaleDefinition, formatLocale } from 'd3-format';
import { TimeLocaleDefinition } from 'd3-time-format';

export default function setupFormatters(
  d3NumberFormat: Partial<FormatLocaleDefinition>,
  d3TimeFormat: Partial<TimeLocaleDefinition>,
) {
  getNumberFormatterRegistry()
    .setD3Format(d3NumberFormat)
    // Add shims for format strings that are deprecated or common typos.
    // Temporary solution until performing a db migration to fix this.
    .registerValue(',0', getNumberFormatter(',.4~f'))
    .registerValue('null', getNumberFormatter(',.4~f'))
    .registerValue('%', getNumberFormatter('.0%'))
    .registerValue('.', getNumberFormatter('.4~f'))
    .registerValue(',f', getNumberFormatter(',d'))
    .registerValue(',r', getNumberFormatter(',.4f'))
    .registerValue('0f', getNumberFormatter(',d'))
    .registerValue(',#', getNumberFormatter(',.4~f'))
    .registerValue('$,f', getNumberFormatter('$,d'))
    .registerValue('0%', getNumberFormatter('.0%'))
    .registerValue('f', getNumberFormatter(',d'))
    .registerValue(',.', getNumberFormatter(',.4~f'))
    .registerValue('.1%f', getNumberFormatter('.1%'))
    .registerValue('1%', getNumberFormatter('.0%'))
    .registerValue('3%', getNumberFormatter('.0%'))
    .registerValue(',%', getNumberFormatter(',.0%'))
    .registerValue('.r', getNumberFormatter('.4~f'))
    .registerValue('$,.0', getNumberFormatter('$,d'))
    .registerValue('$,.1', getNumberFormatter('$,.1~f'))
    .registerValue(',0s', getNumberFormatter(',.4~f'))
    .registerValue('%%%', getNumberFormatter('.0%'))
    .registerValue(',0f', getNumberFormatter(',d'))
    .registerValue('+,%', getNumberFormatter('+,.0%'))
    .registerValue('$f', getNumberFormatter('$,d'))
    .registerValue('+,', getNumberFormatter(NumberFormats.INTEGER_SIGNED))
    .registerValue(',2f', getNumberFormatter(',.4~f'))
    .registerValue(',g', getNumberFormatter(',.4~f'))
    .registerValue('int', getNumberFormatter(NumberFormats.INTEGER))
    .registerValue('.0%f', getNumberFormatter('.1%'))
    .registerValue('$,0', getNumberFormatter('$,.4f'))
    .registerValue('$,0f', getNumberFormatter('$,.4f'))
    .registerValue('$,.f', getNumberFormatter('$,.4f'))
    .registerValue('DURATION', createDurationFormatter())
    .registerValue(
      'DURATION_SUB',
      createDurationFormatter({ formatSubMilliseconds: true }),
    )
    .registerValue(
      'DURATION_COL',
      createDurationFormatter({ colonNotation: true }),
    )
    .registerValue('MEMORY_DECIMAL', createMemoryFormatter({ binary: false }))
    .registerValue('MEMORY_BINARY', createMemoryFormatter({ binary: true }))
    .registerValue(
      'MEMORY_TRANSFER_RATE_DECIMAL',
      createMemoryFormatter({ binary: false, transfer: true }),
    )
    .registerValue(
      'MEMORY_TRANSFER_RATE_BINARY',
      createMemoryFormatter({ binary: true, transfer: true }),
    );

  registerLocalizedSmartNumberFormatters(
    getNumberFormatterRegistry().d3Format,
  );

  const timeFormatterRegistry = getTimeFormatterRegistry();

  timeFormatterRegistry
    .setD3Format(d3TimeFormat)
    .registerValue(
      SMART_DATE_ID,
      createSmartDateFormatter(timeFormatterRegistry.d3Format),
    )
    .registerValue(
      SMART_DATE_VERBOSE_ID,
      createSmartDateVerboseFormatter(timeFormatterRegistry.d3Format),
    )
    .registerValue(
      SMART_DATE_DETAILED_ID,
      createSmartDateDetailedFormatter(timeFormatterRegistry.d3Format),
    )
    .setDefaultKey(SMART_DATE_ID);
}


/**
 * Overrides the "Adaptive formatting" formatters (SMART_NUMBER and
 * SMART_NUMBER_SIGNED) so they honor the configured D3_FORMAT locale
 * (e.g. decimal "," and thousands "."), producing values like 13,3B or 12,3M.
 * The upstream implementation always uses the default (en-US) locale.
 */
function registerLocalizedSmartNumberFormatters(
  locale: FormatLocaleDefinition,
) {
  const d3Locale = formatLocale(locale);
  const siFormat = d3Locale.format('.3~s');
  const oneDecimalFormat = d3Locale.format(',.1~f');
  const twoDecimalFormat = d3Locale.format(',.2~f');
  const fourDecimalFormat = d3Locale.format('.4~f');

  const formatValue = (value: number): string => {
    if (!Number.isFinite(value)) return String(value);
    if (value === 0) return '0';

    const abs = Math.abs(value);
    if (abs >= 1e12) return `${oneDecimalFormat(value / 1e12)}T`;
    if (abs >= 1e9) return `${oneDecimalFormat(value / 1e9)}MM`;
    if (abs >= 1e6) return `${oneDecimalFormat(value / 1e6)}M`;
    if (abs >= 1e3) return `${oneDecimalFormat(value / 1e3)}k`;
    if (abs >= 1) return twoDecimalFormat(value);
    if (abs >= 0.001) return fourDecimalFormat(value);
    if (abs > 0.000001) return `${siFormat(value * 1e6)}µ`;
    return siFormat(value);
  };

  getNumberFormatterRegistry()
    .registerValue(
      NumberFormats.SMART_NUMBER,
      new NumberFormatter({
        id: NumberFormats.SMART_NUMBER,
        label: 'Adaptive formatting',
        formatFunc: formatValue,
      }),
    )
    .registerValue(
      NumberFormats.SMART_NUMBER_SIGNED,
      new NumberFormatter({
        id: NumberFormats.SMART_NUMBER_SIGNED,
        label: 'Adaptive formatting (signed)',
        formatFunc: (value: number) =>
          `${value > 0 ? '+' : ''}${formatValue(value)}`,
      }),
    );
}
