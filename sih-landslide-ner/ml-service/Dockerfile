# ==========================================
# Production Dockerfile for FastAPI ML Engine
# ==========================================
FROM python:3.10-slim

# Set environment configurations
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install minimal OS dependencies needed for compiling C extensions (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user and group
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy model artifacts, GIS data grids, and application code
COPY models ./models
COPY data ./data
COPY src ./src

# Set ownership of /app to appuser
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose HTTP port (configured by Railway or defaults to 8000)
EXPOSE 8000

# Health check command for container runtimes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start FastAPI application with Uvicorn
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT}"]
