# Google OAuth setup (Butterbase)

Needed for **Continue with Google** and a smoother Colab handoff (same Google session).

## 1. Google Cloud Console

1. https://console.cloud.google.com/apis/credentials  
2. Create **OAuth client ID** → Web application  
3. Authorized JavaScript origins:
   - `http://localhost:3000`
   - your Butterbase frontend URL when deployed  
4. Authorized redirect URIs (Butterbase callback — required):
   ```
   https://api.butterbase.ai/auth/app_wkr61q0xkhs8/oauth/google/callback
   ```
5. Copy **Client ID** and **Client secret**

## 2. Configure Butterbase (MCP or ask the agent)

```
app_id: app_wkr61q0xkhs8
provider: google
redirect_uris: ["https://api.butterbase.ai/auth/app_wkr61q0xkhs8/oauth/google/callback"]
client_id: <from Google>
client_secret: <from Google>
```

Or paste the two values into chat and ask to run `manage_oauth`.

## 3. App callback

Frontend redirect after Butterbase finishes OAuth:

`http://localhost:3000/auth/callback`

(Already implemented — `signInWithOAuth({ redirectTo })`.)

## 4. Env (optional mirror)

```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
```

Not required in Next.js if configured only via Butterbase MCP.
