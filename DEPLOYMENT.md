# 🚀 Deployment Guide: Deploying TermiusWeb to Your Domain

Panduan lengkap untuk memasang **TermiusWeb** ke server VPS Anda (`31.97.109.165`) dan menghubungkannya dengan domain milik Anda sendiri (misalnya: `https://ssh.domainanda.com`).

---

## Cara 1: Deploy Menggunakan Docker (Direkomendasikan)

### 1. Upload/Clone Proyek ke VPS
Di komputer lokal Anda, buka terminal lalu upload folder proyek ke VPS:
```bash
scp -r g:/Server root@31.97.109.165:/opt/web-termius
```
*atau clone dari repo git Anda jika sudah di-push ke GitHub/GitLab.*

### 2. Jalankan Container Docker di VPS
Masuk ke VPS Anda via SSH:
```bash
ssh root@31.97.109.165
```

Jalankan perintah berikut di VPS:
```bash
cd /opt/web-termius
docker compose up -d --build
```
Aplikasi TermiusWeb sekarang sudah berjalan secara otomatis di port `3001`!

---

## Cara 2: Deploy Direct Node.js (Tanpa Docker)

Jika tidak menggunakan Docker:
```bash
# 1. Masuk ke VPS
ssh root@31.97.109.165

# 2. Install Node.js jika belum ada
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs pm2

# 3. Masuk ke direktori server & install
cd /opt/web-termius/server
npm install

# 4. Build frontend
cd ../client
npm install
npm run build

# 5. Jalankan backend dengan PM2 agar terus berjalan 24/7
cd ../server
pm2 start index.js --name "web-termius"
pm2 save
pm2 startup
```

---

## 🌐 Menghubungkan ke Domain Anda & Mengaktifkan SSL (HTTPS)

### Langkah A: Setting DNS Management Domain
Buka panel DNS domain Anda (Cloudflare, Hostinger, Niagahoster, dll):
1. Tambahkan **A Record**:
   - **Type**: `A`
   - **Name/Host**: `ssh` (atau `@` untuk root domain)
   - **IPv4 Address**: `31.97.109.165`
   - **TTL**: Auto / 300

### Langkah B: Setting Nginx & SSL Certbot di VPS
Di VPS Anda (`31.97.109.165`), jalankan perintah:

```bash
# 1. Install Nginx & Certbot
apt update
apt install -y nginx certbot python3-certbot-nginx

# 2. Buat konfigurasi Nginx untuk domain Anda
nano /etc/nginx/sites-available/termius
```

Isikan konfigurasi berikut (ganti `ssh.domainanda.com` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name ssh.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # Header WebSocket WSS
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keepalive SSH WebSocket stream
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Aktifkan konfigurasi & restart Nginx:
```bash
ln -s /etc/nginx/sites-available/termius /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Langkah C: Pasang SSL Certificate Gratis (HTTPS / SSL)
Jalankan Certbot untuk mendapatkan Sertifikat SSL gratis dari Let's Encrypt:
```bash
certbot --nginx -d ssh.domainanda.com
```

Selesai! Sekarang Anda dapat mengakses **TermiusWeb** dari mana saja via browser melalui `https://ssh.domainanda.com` tanpa membuka aplikasi desktop Termius! 🎉
