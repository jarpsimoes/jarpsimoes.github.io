# Personal laboratory landing zone [AZURE]
###### **_Lab tutorial I_**
### Overview
Cloud providers have brought the ability to create environments by IaC
(**I**nfrastructure **a***s **C**ode).
This technology is very relevant when we are going to migrate infrastructure to the cloud
because it allows us to maintain and evolve resources based on code with the ability of
version control (eg GIT). The two most relevant technologies to
use IaC are:

- Cloud Provider API (CLI, ARM Templates, Plumia, etc)
- Terraform

Terraform is a cross cloud provider language to provisioning and manage infrastructure, that
has some advantages, such as single language cross-platform, but the state control is the
really relevant feature.

Terraform state allows all infrastructure components as code, and can be created, updated
and deleted with changes on terraform files.

### 1. Requirements
This tutorial requires some tools are installed in host environment, that will use Azure as a
cloud provider with CLI authentication and terraform:

- Azure CLI: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Terraform: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli

---
**Notes**:
- Must have an Azure Subscription with credits to perform this tutorial
- Should have a GitHub Account to store terraform modules and perform infra-structure updates
---

After those tools are installed on environment, let's get started.

### 2. Create Project Structure

The first step is to create project scaffold.

Create structure:
```shell
$ mkdir tf-modules 
$ mkdir -p tf-modules/landing-zone-module
```
Create base files for each folder:
````shell
$ touch tf-modules/landing-zone-module/main.tf tf-modules/landing-zone-module/variabled.tf tf-modules/landing-zone-module/README.md
````

Module project:
```
tf-modules
|-- landing-zone-module
    |-- main.tf
    |-- variables.tf
    |-- README.md
```

- **landing-zone-module**: This module will provide a Resource Group to be used as
  a target for each resource and storage account with a container to store Terraform
  States


- **virtual-network**: This module will create a virtual network with configured
  subnets to support all products


- **kubernetes-cluster**: This module will configure an AKS (Azure Kubernetes Service) with configured node pools

### 3. Create LANDING-ZONE-MODULE

This is the simplest module. To reach your target, you only need to create a resource
group with the selected name and a storage account with a container to be
used as state storage for each of next components

---
**Note**: In this example, that module will not have state control, but this isn't
the right implementation. The Azure Resources are used to store states, then
needs to provide landing zone before being ready to save states.
---

Open file with your preferred IDE (such as VS Code, Intellij, vim) and paste the following
content:

Create Resource Group:
```yaml
resource "azurerm_resource_group" "rg" {
    name = "${var.name}-rg" # All resource groups created by this module ends with -rg
    location = var.location 

    tags = var.default_tags # All resource groups will have a set of predefined tags
}
```
<sup>Docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group


Create an Azure Storage Account:
```yaml
resource "azurerm_storage_account" "sa_landing" {
    depends_on = [
      azurerm_resource_group.rg # Only will be created after RG has created 
    ]

    name = replace("${var.name}sa", "-", "") # Dash's will be removed from the name and ends with "sa" 
    resource_group_name = azurerm_resource_group.rg.name
    location = var.location
    account_tier = var.service_account_level.tier
    account_replication_type = var.service_account_level.replication_type

    tags = var.default_tags
}
```
<sup>Docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account

Create an Azure Storage Container:
```yaml
resource "azurerm_storage_container" "state_container" {
    depends_on = [
      azurerm_storage_account.sa_landing
    ]
    name = "${var.name}-state-container"
    storage_account_name = azurerm_storage_account.sa_landing.name
    container_access_type = "private"
}
```
<sup>Docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container

Sometimes must be use the results to another module, and then it's a good practice to return the most relevant data.

To support these module, some variables should be declared to configure the module. When the variables are not
mandatory  a default value should be defined to be used.

In variables.tf file, insert following lines:
```shell
variable "name" {
  type = string
}
variable "location" {
  type = string

  default = "West Europe"
}
variable "default_tags" {
    type = map

    default = {
        scope = "laboratory"
        user = "jarpsimoes"
        provisioner = "terraform"
    }
}
variable "service_account_level" {
    type = object({
        tier = string
        replication_type = string 
    })
    default = {
      replication_type = "LRS"
      tier = "Standard"
    }
}
```

Create Outputs:
```yaml
output "landing-zone-data" {
    value = {
        container_state_name = azurerm_storage_container.state_container.name
        resource_group_name = azurerm_resource_group.rg.name
        resource_group_id = azurerm_resource_group.rg.id
        resources_base_location = azurerm_resource_group.rg.location
    }
}
```

These outputs can be used for example:

````yaml
module "landing_zone" {
  source = "github.com/jarpsimoes/tf-modules/landing-zone-module"
  name = "any-name"
}

module "other_module" {
  source = "../example"
  name = "test"
  resource_group = module.landing_zone.resource_group_name
}
````

### 4. Test Module

Before test this module, the changes must be pushed to the repository, or use the absolute path as a source.

Create a folder named **example** and main.tf with following content:

```yaml
# Configure Provider
terraform {
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
      version = "3.35.0"
    }
  }
}

provider "azurerm" {
  features {

  }
}

# Configure Variables
variable "name" {
  type = string
}

# Call Module
module "landing-zone" {
  source = "github.com/jarpsimoes/tf-modules/landing-zone-module"
  name = var.name
}
```

Before test apply, a login must be needed on your Azure Tennant and set the subscription to be used.

```shell
$ az login # Will open your browser to login in your Tennant
$ az account set --subscription [SUBSCRIPTION ID]
```

Initialize Terraform environment on **example** folder:

```shell
$ terraform init
```

If this action run with success, the output should be something like this:

```shell
Initializing modules...
Downloading git::https://github.com/jarpsimoes/tf-modules.git for landing-zone...
- landing-zone in .terraform/modules/landing-zone/landing-zone-module

Initializing the backend...

Initializing provider plugins...
- Reusing previous version of hashicorp/azurerm from the dependency lock file
- Using previously-installed hashicorp/azurerm v3.35.0

Terraform has been successfully initialized!

You may now begin to work with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forgot, other
commands will detect it and remind you to do it, if necessary.
```
After terraform initialized with success, needs to be applied to provisioning all components. Then will be run to 
apply command:

```shell
$ terraform plan
```

If it doesn't appear any error, should be prompt something like this:

```shell
var.name
  Enter a value: _
```

Must be defined a landing zone name, for example: operator-lab

```shell
Terraform use the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # module.landing-zone.azurerm_resource_group.rg will be created
  + resource "azurerm_resource_group" "rg" {
      + id       = (known after apply)
      + location = "westeurope"
      + name     = "operator-lab-rg"
      + tags     = {
          + "provisioner" = "terraform"
          + "scope"       = "laboratory"
          + "user"        = "jarpsimoes"
        }
    }

  # module.landing-zone.azurerm_storage_account.sa_landing will be created
  + resource "azurerm_storage_account" "sa_landing" {

  (...)    

Plan: 3 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: 
```
##
When accepted, all components will be created. This action can last a few minutes. The process finish when 
this message appear:

```shell
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

### 5. Destroy Landing Zone

After all steps are finished, you can destroy all components with the following command:

```shell
$ terraform destroy
```

### 6. Documents

All sources created during this tutorial are available at repository: https://github.com/jarpsimoes/tf-modules
