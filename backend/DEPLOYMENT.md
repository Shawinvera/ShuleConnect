# Deploy to a Linux box

1. **Prepare the environment**

SSH into your Droplet and set up Java + a systemd service:
```bash
# Install Java (match your project's version)
apt update && apt install -y openjdk-21-jre-headless

# Create app directory and a dedicated user (optional but recommended)
useradd -m -s /bin/false waziapp
mkdir -p /opt/wazi-backend
chown waziapp:waziapp /opt/wazi-backend
```

Create a systemd service file at `/etc/systemd/system/waziapp.service` with the following content:
```bash
[Unit]
Description=Wazi Backend App
After=network.target

[Service]
User=waziapp
WorkingDirectory=/opt/wazi-backend
EnvironmentFile=/opt/wazi-backend/.env
ExecStart=/usr/bin/java -jar /opt/wazi-backend/app.jar
SuccessExitStatus=143
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
systemctl daemon-reload
```
```bash
systemctl enable waziapp
```
```bash
systemctl start waziapp
```

2. **Add GitHub Secrets**
In your GitHub repository, navigate to `Settings` > `Secrets and variables` > `Actions` and add the following secrets:
- `SK1_DO_SSH_HOST`: Your Droplet's IP address (e.g., `123.123.123.123`)
- `SK1_DO_SSH_USER`: The username you use to SSH into the Droplet (e.g., `root` or `waziapp`)
- `SK1_DO_SSH_KEY`: The private SSH key (in PEM format) that corresponds to the public key added to the Droplet's `~/.ssh/authorized_keys`

To generate the SSH key pair, you can use:
```bash
ssh-keygen -t ed25519 -C "sk1-digitalocean" -f ~/.ssh/sk1_do
````
This creates two files:
```
~/.ssh/sk1_do — private key (goes to GitHub)
~/.ssh/sk1_do.pub — public key (goes to Droplet)
```

- Add the public key to your Droplet:
```bash
ssh-copy-id -i ~/.ssh/sk1_do.pub root@YOUR_DROPLET_IP
```

- Add the private key to GitHub Secrets:
```
cat ~/.ssh/sk1_do
```

- Then go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

**Name:** SK1_DO_SSH_KEY

**Value:** paste the private key


- Test the connection
```bash
ssh -i ~/.ssh/sk1_do root@YOUR_DROPLET_IP
```

3.**Configure GitHub Actions Workflow**
Create a GitHub Actions workflow file at `.github/workflows/deploy.yml` with the following
```yaml
name: CI/CD — Wazi-backend github deploy

on:
  push:
    branches: [deploy]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven

      - name: Build JAR
        run: mvn -B package -DskipTests=false --no-transfer-progress

      # Copy JAR to Droplet via SCP
      - name: Copy JAR to Droplet
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SK1_DO_SSH_HOST }}
          username: ${{ secrets.SK1_DO_SSH_USER }}
          key: ${{ secrets.SK1_DO_SSH_KEY }}
          source: "target/*.jar"
          target: "/opt/wazi-backend/"
          strip_components: 1   # removes the "target/" prefix

      - name: Write .env and restart app
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SK1_DO_SSH_HOST }}
          username: ${{ secrets.SK1_DO_SSH_USER }}
          key: ${{ secrets.SK1_DO_SSH_KEY }}
          envs: ENV_FILE                      # pass the secret into the SSH session
          script: |
            echo "$ENV_FILE" > /opt/wazi-backend/.env
            chmod 600 /opt/wazi-backend/.env
            chown waziapp:waziapp /opt/wazi-backend/.env
            mv /opt/wazi-backend/*.jar /opt/wazi-backend/app.jar
            systemctl restart waziapp
            systemctl is-active --quiet waziapp && echo "✅ App started" || echo "❌ Start failed"
        env:
          ENV_FILE: ${{ secrets.ENV_FILE }}
```