# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj và restore dependencies
COPY ["ParkingBMS.Gateway.csproj", "./"]
RUN dotnet restore "./ParkingBMS.Gateway.csproj"

# Copy toàn bộ file nguồn và build
COPY . .
RUN dotnet build "ParkingBMS.Gateway.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "ParkingBMS.Gateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Run
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "ParkingBMS.Gateway.dll"]
