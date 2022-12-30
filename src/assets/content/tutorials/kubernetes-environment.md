# Kubernetes Cluster [AZURE]
###### **_Lab tutorial III_**

### Index
[1. Requirements](#1-requirements)

[2. Goals](#2-goals)

[3. Project Structure](#3-create-project-structure)

[4. Kubernetes Cluster](#4-create-kubernetes-cluster-submodule)

[5. Helm Installer](#5-create-helm-installer-submodule)

[6. Wrapper module](#6-create-module-wrapper)

[7. Test module]()

### Overview
This tutorial will expose how can create a kubernetes cluster on Azure (AKS) with IaC (Terraform). Will be provisioned 
one cluster for each environment (Development and Production), and install default tools for each cluster by helm. 

### 1. Requirements
This tutorial requires some tools are installed in host environment, that will use Azure as a
cloud provider with CLI authentication and terraform:

- Azure CLI: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Terraform: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli


---
**Notes**:
- Must have an Azure Subscription with credits to perform that tutorial
- Should have a GitHub Account to store terraform modules and perform infra-structure updates
---
This tutorial is a continuation of the Virtual Network tutorial

### 2. Goals
This module will have two submodules, the aks-generator module, that must be able to provide a Kubernetes Cluster with default
nodes pool and, should be possible to add a node pool when required. The main configurations of kubernetes 
cluster (e.g.: vm_size, node_pool_size, etc.) should be able to be customized. The helm installer submodule 
should be able to receive a list of helm charts to be installed on the cluster when cluster are available.

### 3. Create Project Structure
As the previous tutorial, the first step is to create a project scaffold. Inside the folder tf-modules (used on the 
previous project), should be created:

```shell
$ mkdir kubernetes-cluster
```

Create base files:
```shell
$ touch kubernetes-cluster/main.tf kubernetes-cluster/variables.tf kubernetes-cluster/README.md
```

As mentioned above, two submodules and respective base files needs to be created:
```shell
$ mkdir kubernetes-cluster/aks-generator kubernetes-cluster/helm-installer
$ touch kubernetes-cluster/aks-generator/main.tf kubernetes-cluster/aks-generator/variables.tf
$ touch kubernetes-cluster/helm-installer/main.tf kubernetes-cluster/helm-installer/variables.tf
```

**Final structure**:
```
tf-modules
|-- kubernetes-cluster
    |-- aks-generator
        |-- main.tf
        |-- variables.tf
        |-- README.md
    |-- helm-installer
        |-- main.tf
        |-- variables.tf
        |-- README.md
    |-- main.tf
    |-- variables.tf
    |-- README.md
```
## Overview
This tutorial will expose how to create a kubernetes cluster on 
Azure (AKS) with IaC (Terraform). Will be provisioned one cluster
for each environment (Development and Production) and, by default, install 
tools for each cluster. 


### 4. Create kubernetes-cluster submodule
On this submodule is going to be used **_azurerm_kubernetes_cluster_** ([official documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster)) and
**_azurerm_kubernetes_cluster_node_pool_** ([official documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool)).

Inside aks-generator/main.tf must be added the following lines to create the cluster:
```
resource "azurerm_kubernetes_cluster" "cluster" {
    name = "${var.name}-${var.environment}"
    location = var.location
    resource_group_name = var.resource_group_name
    dns_prefix = "${replace(var.environment, "-", "")}"
    http_application_routing_enabled = false
    node_resource_group = "${var.name}-nodes"

    network_profile {
      network_plugin = "azure"
      service_cidr = var.service_cidr
      dns_service_ip = var.dns_service_ip
      docker_bridge_cidr = var.docker_bridge_cidr
    }

    default_node_pool {
      name = "npdefault"
      vm_size = var.default_node_pool.vm_size
      enable_auto_scaling = true
      min_count = var.default_node_pool.min_nodes
      max_count = var.default_node_pool.max_nodes
      node_count = var.default_node_pool.initial_node_count
      vnet_subnet_id = var.default_node_pool.vnet_subnet_id
    }

    azure_policy_enabled = true
    identity {
      type = "SystemAssigned"
    }

    tags = var.required_tags
}
```

This module have support to the "default node pool" size, number of nodes, subnetwork and 
containers network profile. With the following lines, will be possible to add node pool:

```
resource "azurerm_kubernetes_cluster_node_pool" "node_pool" {
    depends_on = [
      azurerm_kubernetes_cluster.cluster
    ]
    kubernetes_cluster_id = azurerm_kubernetes_cluster.cluster.id
    count = length(var.additional_node_pool)
    name = replace("${var.name}${count.index + 1}", "-", "")
    node_count = var.additional_node_pool[count.index].initial_node_count
    min_count = var.additional_node_pool[count.index].min_nodes
    max_count = var.additional_node_pool[count.index].max_nodes
    vm_size = var.additional_node_pool[count.index].vm_size
    vnet_subnet_id = var.default_node_pool.vnet_subnet_id
    enable_auto_scaling = true
    tags = {
        cluster = "${var.name}-${var.environment}"
    }
}
```
---

**NOTE**: This module will wait until the cluster will be available

---

Finally, should be returned the data of the cluster (after they are available):

```
output "cluster_data" {
  value = azurerm_kubernetes_cluster.cluster
}
```

On variables files, aks-generator/variables.tf, must be appended the following lines:
```
variable "name" {
  type = string
}
variable "location" {
  type = string
}
variable "resource_group_name" {
  type = string
}
variable "environment" {
  type = string
}
variable "service_cidr" {
  type = string
}
variable "dns_service_ip" {
  type = string
}
variable "docker_bridge_cidr" {
  type = string
  default = "172.17.0.1/16"
}
variable "default_node_pool" {
  type = object({
    vm_size = string
    vnet_subnet_id = string
    initial_node_count = number
    min_nodes = number
    max_nodes = number
  })
}
variable "required_tags" {
  type = map(string)
}
variable "additional_node_pool" {
  type = list(object({
    name = string
    initial_node_count = number
    min_nodes = number
    max_nodes = number
    vm_size = string
    vnet_subnet_id = string
  }))
}
```

### 5. Create helm-installer submodule
The kubernetes cluster is a common host used in many applications types, depending
the type, should be deployed some  tools to support architecture. For example in 
microservices applications, can be needed to install Istio, as an API Manager and as Ingress.

This module will support Helm Charts to install the default tools on cluster, to do that, "Terraform Helm Provider"
is the tool to use.

On helm-install/main.tf must be added the following lines:
```
provider "helm" {
    kubernetes {
        host = "${var.cluster.host}"
        client_certificate = "${var.cluster.client_certificate}"
        client_key = "${var.cluster.client_key}"
        cluster_ca_certificate = "${var.cluster.cluster_ca_certificate}"
    }
}
```

After Helm provider is created, should be installed provided charts as variables:
```
resource "helm_release" "helm" {
    count = length(var.helm)

    name = var.helm[count.index].name
    repository = var.helm[count.index].repository
    chart = var.helm[count.index].chart
    create_namespace = var.helm[count.index].create_namespace
    
    values = var.helm[count.index].values_file != "" ? [var.helm[count.index].values_file] : []
}
```

---
**NOTE**: This module will have support to install a list of helm charts, as can be seen in  
```count = length(var.helm)```. With that line, will be installed each module present as 
variables.

---


The variables file (helm-installer/variables.tf) must declare the variables used:

```
variable "cluster" {
  type = object({
    host = string
    client_certificate = string
    client_key = string
    cluster_ca_certificate = string
  })
}

variable "helm" {
  type = list(object({
    values_file = string
    name = string
    repository = string
    chart = string
    create_namespace = bool
  }))
}
```

### 6. Create module wrapper
To finish that module, must be created the wrapper that is going be used. Then should be written 
the following lines on main.tf at the root module:

```
module "kubernetes_cluster" {
    source = "./aks-generator"

    name = var.name
    environment = var.environment
    location = var.location
    resource_group_name = var.resource_group_name
    service_cidr = var.service_cidr
    dns_service_ip = var.dns_service_ip

    default_node_pool = {
      initial_node_count = var.default_node_pool.initial_node_count
      max_nodes = var.default_node_pool.max_nodes
      min_nodes = var.default_node_pool.min_nodes
      vm_size = var.default_node_pool.vm_size
      vnet_subnet_id = var.default_node_pool.vnet_subnet_id
    }

    additional_node_pool = var.additional_node_pool
    required_tags = var.required_tags
}

module "helm_installer" {
    
    source = "./helm-installer"

    cluster = {
      host                   = "${module.kubernetes_cluster.cluster_data.kube_config.0.host}"
      client_certificate     = "${base64decode(module.kubernetes_cluster.cluster_data.kube_config.0.client_certificate)}"
      client_key             = "${base64decode(module.kubernetes_cluster.cluster_data.kube_config.0.client_key)}"
      cluster_ca_certificate = "${base64decode(module.kubernetes_cluster.cluster_data.kube_config.0.cluster_ca_certificate)}"
    }

    helm = var.helm

}
```

and on the variables file variables.tf:

```
variable "name" {
  type = string
}
variable "location" {
  type = string
}
variable "resource_group_name" {
  type = string
}
variable "environment" {
  type = string
}
variable "service_cidr" {
  type = string
}
variable "dns_service_ip" {
  type = string
}
variable "required_tags" {
  type = map(string)
}

variable "default_node_pool" {
  type = object({
    initial_node_count = number
    max_nodes = number
    min_nodes = number
    vm_size = string
    vnet_subnet_id = string
  })
}
variable "additional_node_pool" {
  type = list(object({
    name = string
    initial_node_count = number
    max_nodes = number
    min_nodes = number
    vm_size = string
    vnet_subnet_id = string
  }))
}

variable "helm" {
  type = list(object({
    values_file = string
    name = string
    repository = string
    chart = string
    create_namespace = bool
  }))
}
```

### 7. Test module

Create test module: in another folder insert de following lines on main.tf:

```
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

data "azurerm_subnet" "subnet" {
    name = "operator-net-dev-k8s-subnet"
    virtual_network_name = "operator-net-dev-vnet"
    resource_group_name = "operator-lab-rg"
}
module "aks" {
    
    source = "../tf-modules/kubernetes-cluster"

    name = "test-aks"
    location = "West Europe"
    resource_group_name = "operator-lab-rg"
    environment = "test"
    service_cidr = "10.2.0.0/16"
    dns_service_ip = "10.2.0.10"
    
    default_node_pool = {
      initial_node_count = 1
      max_nodes = 1
      min_nodes = 1
      vm_size = "Standard_B2s"
      vnet_subnet_id = data.azurerm_subnet.subnet.id
    }

    additional_node_pool = [{
      name = "tnpool"
      initial_node_count = 1
      max_nodes = 1
      min_nodes = 1
      vm_size = "Standard_B2s"
      vnet_subnet_id = data.azurerm_subnet.subnet.id
    }]

    required_tags = {
      "name": "test"
    }

    helm = [ {
      chart = "ingress-nginx"
      create_namespace = true
      name = "nginx-ingress"
      repository = "https://kubernetes.github.io/ingress-nginx"
      values_file = ""
    } ]
}
```

Then in the root of test folder, must run:
```shell
$ terraform init
Initializing modules...

Initializing the backend...

(...)

Terraform has made some changes to the provider dependency selections recorded
in the .terraform.lock.hcl file. Review those changes and commit them to your
version control system if they represent the changes you intended to make.

Terraform has been successfully initialized!

You may now begin to work with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forgot, other
commands will detect it and remind you to do it, if necessary.

$ terraform apply -auto-approve
data.azurerm_subnet.subnet: Reading...
(...)
Plan: 3 to add, 0 to change, 0 to destroy.
(...)
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

At the end all resources can be destroyed with the following command:
```shell
$ terraform destroy -auto-approve
Apply complete! Resources: 0 added, 0 changed, 3 destroyed.
```
