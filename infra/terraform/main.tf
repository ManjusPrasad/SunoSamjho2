terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 8.0"
    }
  }
}

provider "google" {
  project = var.project_id
}

variable "project_id" {
  description = "Google Cloud/Firebase project ID to configure."
  type        = string
  default     = "studio-8773521461-fa390"
}

resource "google_project_service" "identity_toolkit" {
  project            = var.project_id
  service            = "identitytoolkit.googleapis.com"
  disable_on_destroy = false
}

resource "google_identity_platform_config" "default" {
  project = var.project_id

  sign_in {
    email {
      enabled           = true
      password_required = false
    }

    phone_number {
      enabled = true
    }
  }

  depends_on = [google_project_service.identity_toolkit]
}
