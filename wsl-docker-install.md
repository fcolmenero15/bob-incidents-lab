**Before the lab, please complete the following (requires a restart):**

1. Open **PowerShell**: press the **Windows key**, type **PowerShell**, right-click **Windows PowerShell**, and then run:

   ```powershell
   wsl --install
   ```

2. Restart your computer when prompted.

3. Finish setting up Ubuntu:
   - After restarting, a terminal window may open automatically and finish installing Ubuntu. If it does, skip to the username prompt below.
   - If no window opens, press the **Windows key**, type **Ubuntu**, and select the **Ubuntu** app. You can also open PowerShell and run: `wsl`
   - Wait for the install to finish. This can take a few minutes.
   - When you see **Enter new UNIX username**, type a username using lowercase letters and no spaces, then press Enter.
   - When you see **New password**, type a password and press Enter. Nothing will appear as you type. This is normal.
   - Retype the password when asked and press Enter.
   - You are done when the prompt ends in `$`, like `username@COMPUTERNAME:~$`
   - Save this password. You will need it during the lab.

4. If you do not already have **Docker Desktop**, install it:
   - Go to **https://www.docker.com/products/docker-desktop/** and select **Download for Windows**. Choose the one appropriate for your computer.
   - Run the downloaded installer. When asked, leave **Use WSL 2 instead of Hyper-V** checked.
   - Restart or sign out if prompted.
   - Open Docker Desktop, accept the terms, and skip sign-in if you prefer.
   - Go to **Settings > General** and make sure **Use the WSL 2 based engine** is enabled.

5. To confirm, open PowerShell and run:

   ```powershell
   wsl --list --verbose
   ```

   Ubuntu should show **VERSION 2**.

If any step fails, especially with a virtualization error, please let me know before the lab.