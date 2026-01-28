# Login Information

## ✅ Authentication ist jetzt aktiv!

Die Anwendung ist vollständig gesichert und erfordert eine Anmeldung.

## Standard Test-Account

Ein Test-Account wurde bereits erstellt:

- **Email**: `admin@example.com`
- **Password**: `admin123456`

## So meldest du dich an

1. Öffne deinen Browser: **http://localhost:3000**
2. Du wirst automatisch zur Login-Seite weitergeleitet
3. Gib die Zugangsdaten ein:
   - Email: `admin@example.com`
   - Password: `admin123456`
4. Klicke auf "Sign In"
5. Du wirst zum Dashboard weitergeleitet 🎉

## Neuen Benutzer erstellen

### Option 1: PocketBase Admin UI

1. Öffne: http://localhost:8090/_/
2. Erstelle zuerst einen Admin-Account (beim ersten Besuch)
3. Gehe zu "Collections" → "users"
4. Klicke "+ New record"
5. Fülle aus:
   - **email**: deine@email.com
   - **password**: dein-passwort
   - **passwordConfirm**: dein-passwort
   - **emailVisibility**: ✓ (aktiviert)
6. Klicke "Create"

### Option 2: Docker Command

```bash
docker compose exec pocketbase /usr/local/bin/pocketbase superuser upsert deine@email.com dein-passwort
```

## Passwort ändern

1. Gehe zu: http://localhost:8090/_/
2. Login als Admin
3. Collections → users
4. Finde deinen Benutzer
5. Klicke auf Edit (Stift-Icon)
6. Setze neues Passwort
7. Speichern

## Abmelden

Klicke auf den "Sign Out" Button in der Sidebar.

## Troubleshooting

### Kann mich nicht anmelden

- Überprüfe, dass die Services laufen: `docker compose ps`
- Überprüfe die Logs: `docker compose logs frontend`
- Stelle sicher, dass du den richtigen Test-Account verwendest

### Passwort vergessen

Setze es über PocketBase Admin zurück (siehe oben).

### 500 Internal Server Error

- Services neustarten: `docker compose restart`
- Logs prüfen: `docker compose logs`

## Sicherheitshinweise

⚠️ **Für die Produktion:**

1. **Ändere das Standard-Passwort sofort!**
2. Verwende starke, einzigartige Passwörter
3. Aktiviere HTTPS (siehe DEPLOYMENT.md)
4. Schütze das PocketBase Admin UI (nur interne IPs)
5. Setze ein sicheres `ENCRYPTION_KEY` in der .env Datei

## Weitere Informationen

- [AUTHENTICATION.md](AUTHENTICATION.md) - Vollständige Authentifizierungs-Dokumentation
- [README.md](README.md) - Hauptdokumentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Produktions-Deployment

---

**Status**: ✅ Voll funktionsfähig
**Test-Account**: admin@example.com / admin123456
