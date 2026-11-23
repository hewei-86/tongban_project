FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# 国内服务器默认走阿里云 PyPI 镜像，海外环境可通过 build-arg 覆盖
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN pip install --no-cache-dir -i "$PIP_INDEX_URL" -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
