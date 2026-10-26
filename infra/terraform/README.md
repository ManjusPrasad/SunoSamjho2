# Firebase Identity Platform

This Terraform configuration enables email sign-in without passwords and phone-number sign-in for the Firebase/Google Cloud project `studio-8773521461-fa390`.

## Apply

1. Install Terraform (1.5+) and authenticate the Google provider using Application Default Credentials. The identity running Terraform needs permission to enable APIs and manage Identity Platform configuration.
2. From the repository root, run `terraform -chdir=infra/terraform init`.
3. Review the proposed changes with `terraform -chdir=infra/terraform plan`.
4. Apply only after reviewing the plan with `terraform -chdir=infra/terraform apply`.

The web app uses Firebase's native email-link sign-in. In the Firebase Console, also enable the Email/Password provider and its Email link (passwordless sign-in) option under Authentication → Sign-in method. Add `localhost` for local development and your deployed app domain under Authentication → Settings → Authorized domains. Configure the Firebase web app values in `.env` using the `VITE_FIREBASE_*` names from `.env.example`, then restart Vite. `VITE_FIREBASE_PROJECT_ID` defaults the auth domain to `<project-id>.firebaseapp.com` if `VITE_FIREBASE_AUTH_DOMAIN` is not set.

The configuration does not provision a custom auth domain or Firebase Hosting. If using a custom link domain, configure it in Firebase Hosting, add it to Authorized domains, and set `VITE_FIREBASE_LINK_DOMAIN` to that exact verified hostname. The email action redirects to the app's current origin at `/finish-signup`, so the app origin must also be authorized. Do not use the example placeholder `auth.yourdomain.com` unless you own and have configured that domain. Do not commit credentials or Terraform state; state can contain sensitive values.

To target a different project, override `project_id` with a Terraform variable or `-var="project_id=..."`.
