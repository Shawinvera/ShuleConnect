# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom and download dependencies first (cached layer)
COPY backend/pom.xml .
RUN mvn dependency:resolve --no-transfer-progress -q || true

# Copy source and build jar
COPY backend/src ./src
RUN mvn clean package -DskipTests --no-transfer-progress

# Stage 2: Run
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8112

ENTRYPOINT ["java", "-jar", "app.jar"]
