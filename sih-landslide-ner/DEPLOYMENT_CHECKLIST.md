# 🚀 NER-Landslide GIS: Master Production Deployment Runbook
**Smart India Hackathon 2026 — Disaster Early Warning System**

This runbook guides you through deploying the complete NER-Landslide GIS stack to production:
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Backend API**: Railway (Spring Boot 3 + Java 17)
- **ML Microservice**: Railway (Python 3.10 FastAPI Engine)
- **Web GIS Dashboard**: Vercel (React + Vite + Leaflet)
- **Mobile Citizen App**: Expo EAS (Standalone Android APK)

---

## 📋 Pre-Deployment Checklist Overview

| Component | Platform | Primary URL / Artifact |
| :--- | :--- | :--- |
| **Database** | Supabase | `db.<project-ref>.supabase.co:5432` |
| **ML Engine** | Railway | `https://<ml-service-name>.up.railway.app` |
| **Backend API** | Railway | `https://<backend-name>.up.railway.app` |
| **Web Dashboard** | Vercel | `https://ner-landslide-gis.vercel.app` |
| **Mobile App** | Expo EAS | `NER-Landslide-Citizen.apk` |

---

## Step 1: Provision Supabase Database & Enable PostGIS

1. Go to [database.new](https://database.new) and create a new Supabase project (e.g. `ner-landslide-db`).
2. Select an Indian region close to NER (e.g., `ap-south-1` / Mumbai) for lowest latency.
3. Save your database password securely.
4. Open the **SQL Editor** in your Supabase dashboard and run:
   ```sql
   -- Enable PostGIS spatial extensions
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;

   -- Verify PostGIS installation
   SELECT PostGIS_Version();
   ```
5. Obtain your JDBC Connection String:
   - Go to **Project Settings** ➔ **Database** ➔ **Connection string** ➔ **URI / JDBC**.
   - Select **Connection pooling** (Port 6543) or Direct (Port 5432).
   - Format for Spring Boot:
     ```
     jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
     ```

---

## Step 2: Deploy ML Microservice on Railway

1. Go to [railway.com](https://railway.com) and create a **New Project**.
2. Select **Deploy from GitHub repo** ➔ choose your repository.
3. In service settings, configure **Root Directory**: `sih-landslide-ner/ml-service` (or `ml-service`).
4. Set the following **Environment Variables** in Railway:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `PORT` | `8000` | Service port |
   | `MODEL_PATH` | `models/xgb_landslide_model.pkl` | Model artifact path |
   | `ALLOWED_ORIGINS` | `*` | Or specify frontend Vercel URL |
5. Click **Deploy**. Railway will build using `ml-service/Dockerfile`.
6. Go to **Settings** ➔ **Networking** ➔ **Generate Domain** (e.g. `https://landslide-ml-production.up.railway.app`).
7. Verify health:
   ```bash
   curl https://<your-ml-railway-domain>/health
   # Expected output: {"status":"HEALTHY","model_loaded":true,"features_count":12,"version":"3.0"}
   ```

---

## Step 3: Deploy Spring Boot Backend on Railway

1. In the same Railway project, click **+ New** ➔ **GitHub Repo** (or add second service from repo).
2. In service settings, configure **Root Directory**: `sih-landslide-ner/backend-server` (or `backend-server`).
3. Set the following **Environment Variables** in Railway:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `PORT` | `8080` | Service listening port |
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<supabase-host>:6543/postgres?sslmode=require` | Supabase JDBC URL |
   | `SPRING_DATASOURCE_USERNAME` | `postgres.<project-ref>` (or `postgres`) | Database user |
   | `SPRING_DATASOURCE_PASSWORD` | `<your-supabase-db-password>` | Database password |
   | `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | `org.postgresql.Driver` | PostgreSQL JDBC Driver |
   | `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Auto-migrate tables on boot |
   | `ML_SERVICE_URL` | `https://<your-ml-railway-domain>` | URL from Step 2 |
   | `JWT_SECRET` | `NERLandslideEarlyWarningSystemSecretKeySIH2026NorthEastIndiaSecurityToken987654321` | JWT Secret Key |
   | `ALLOWED_ORIGINS` | `https://ner-landslide-gis.vercel.app,http://localhost:5173,http://localhost:3000` | Web & local origins |
   | `SMS_PROVIDER` | `TWILIO_MSG91_SIMULATED` | Switch to `TWILIO` or `MSG91` if live |
4. Click **Deploy**. Railway will execute the multi-stage Maven build from `backend-server/Dockerfile`.
5. Go to **Settings** ➔ **Networking** ➔ **Generate Domain** (e.g. `https://landslide-backend-production.up.railway.app`).
6. Verify health check:
   ```bash
   curl https://<your-backend-railway-domain>/actuator/health
   # Expected output: {"status":"UP", ...}
   ```

---

## Step 4: Deploy Web GIS Dashboard on Vercel

1. Go to [vercel.com](https://vercel.com) ➔ **Add New Project** ➔ Import Git Repository.
2. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `sih-landslide-ner/frontend-dashboard` (or `frontend-dashboard`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add **Environment Variables** in Vercel:
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-backend-railway-domain>` |
   | `VITE_ML_API_BASE_URL` | `https://<your-ml-railway-domain>` |
4. Click **Deploy**.
5. Once deployed, copy your production Vercel domain (e.g., `https://ner-landslide-gis.vercel.app`) and update the `ALLOWED_ORIGINS` env var in the Railway Backend service if not already matching.

---

## Step 5: Firebase Project & Domain Authorization

1. Open [Firebase Console](https://console.firebase.google.com).
2. Under **Authentication** ➔ **Settings** ➔ **Authorized Domains**:
   - Add your Vercel frontend domain (e.g., `ner-landslide-gis.vercel.app`).
   - Add your Railway backend domain (e.g., `landslide-backend-production.up.railway.app`).
3. Under **Project Settings** ➔ **Service Accounts**:
   - (Optional for live push) Generate a new private key and paste into Railway's `FIREBASE_CREDENTIALS_JSON` env var.

---

## Step 6: Build Standalone Mobile Android APK (Expo EAS)

1. Open your terminal and navigate to the mobile app directory:
   ```bash
   cd sih-landslide-ner/mobile-app
   ```
2. Log in to your Expo account:
   ```bash
   npx eas-cli login
   ```
3. Initialize EAS project (if not already initialized):
   ```bash
   npx eas-cli init
   ```
4. Build the standalone installable APK using the `preview` profile:
   ```bash
   EXPO_PUBLIC_API_BASE_URL="https://<your-backend-railway-domain>" \
   EXPO_PUBLIC_ML_API_BASE_URL="https://<your-ml-railway-domain>" \
   npx eas-cli build --platform android --profile preview
   ```
5. Once the EAS cloud build finishes, download the `.apk` directly to your Android device or share the QR code with hackathon evaluators.

---

## Step 7: End-to-End Verification Test

1. **Web Dashboard**:
   - Open your Vercel URL in browser.
   - Confirm live GIS heatmap loads ~1,400 points from Supabase / Spring Boot backend.
   - Click "Simulate Rainfall Surge" to test backend/ML recalibration.
2. **Authority Dispatcher**:
   - Go to Alerts page, select High-Risk Red Zone, click **Dispatch Emergency Alert**.
   - Verify SMS simulation and real-time broadcast endpoint response.
3. **Mobile Citizen App**:
   - Install the generated APK on an Android device or launch in Expo.
   - Log in with phone OTP (`123456`).
   - Verify active hazard zone detection & instant push notification banner.
