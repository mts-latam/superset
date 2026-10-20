FROM mts-superset-base

USER root   
RUN . /app/.venv/bin/activate \
    && uv pip install -e ".[redshift,postgres]"
COPY --chown=superset superset_config.py /app/
ENV SUPERSET_CONFIG_PATH=/app/superset_config.py
COPY --chown=superset ./static/* /app/superset/static/assets/images/


USER superset
ENTRYPOINT [ "/app/docker/entrypoints/run-server.sh" ]