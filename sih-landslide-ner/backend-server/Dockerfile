# ==========================================
# Build Stage: Compile and Package with Maven
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /build

# Copy Maven descriptor and fetch dependencies (layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application source code and package JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# Run Stage: Production-grade slim JRE
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-privileged user and group for security, and ensure /app and uploads directory are writable
RUN addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /app/uploads/reports \
    && chown -R spring:spring /app
USER spring:spring

# Copy compiled JAR from build stage
COPY --from=builder --chown=spring:spring /build/target/*.jar app.jar

# Expose HTTP port (Railway and cloud providers dynamically set $PORT)
ENV PORT=8080
EXPOSE 8080

# Configure container-aware JVM flags with explicit memory ceilings for 512MB environments
ENV JAVA_OPTS="-Xms128m -Xmx350m -XX:+UseG1GC -XX:+UseContainerSupport -Djava.security.egd=file:/dev/./urandom"

# Start the Spring Boot application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT}"]
