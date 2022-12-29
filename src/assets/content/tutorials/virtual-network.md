# Virtual Network [AZURE]
###### **_Lab tutorial II_**

## Index

[1. Requirements](#1-requirements)

[2. Project Structure](#2-create-project-structure)

[3. Network Security Groups](#3-create-network-security-groups)

[4. Networks](#4-create-virtual-networks)

[5. Wrapper](#5-wrapper)

[6. Implementation](#6-implementation)

## Overview
One of the most common requirement when will be change our infrastructure to the
cloud, it's configure a virtual network to allows connections between 
components and orchestrate these connections by rules. 

All cloud providers has these components, with similar names. This tutorial will
provide the following components:
- Network Security Group
- Virtual Network
- Subnets (kubernetes network, linux virtual machines network, 
windows virtual machines network, production network)
- Network Peering (connection between subnets)

##### Target architecture design
![MarineGEO circle logo](/assets/img/sample-network-arch.png "Network Arch")

##

**_Network Rules_**

- All components on linux vm subnet can be connected via port 22 (ssh) from all ips
- All components on windows vm subnet can be connected via port 3389 (rdp) from all ips
- All components inside same subnet can be connected by all protocols without limits
- All components can connect between subnets on ports 22, 80, 443, 3306 and 5432 with TCP
- All components accept connections from shared network by all protocols without limits
- Connections between prod and dev network will be blocked

##
### 1. Requirements
This tutorial requires some tools installed in host environment, will use Azure as a
cloud provider with CLI authentication and terraform:

- Azure CLI: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Terraform: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli

---
**Notes**:
- Must have an Azure Subscription with credits to perform that tutorial
- Should have a GitHub Account to store terraform modules and perform infra-structure updates
---

This tutorial it's a continuation of the **_Personal laboratory landing zone_**

### 2. Create Project Structure

As the previous tutorial, the first step it's create project scaffold. Inside of 
folder tf-modules (created on the previous project), should be created:

```shell
$ mkdir virtual-network
```

And must be created the base files:

```shell
$ touch virtual-network/main.tf virtual-network/variabled.tf virtual-network/README.md 
```
Module project:
```
tf-modules
|-- virtual-network
    |-- main.tf
    |-- variables.tf
    |-- README.md
```

This module will have more 4 submodules, to prevent duplicated code. 

- nsg-generator-std: this module contains all rules to be applied on the _development_ 
and _production_ subnets, both subnets will have similar rules;
- nsg-generator-shr: this module contains all rules to be applied on the shared subnets;
- vnet-generator-std: this module will create virtual network and apply respective nsg;
- vnet-generator-shr: this module will create the shared network, subnets and apply respective nsg;

Then will be need create that modules with following commands:

```shell
$ cd tf-modules/virtual-network
$ mkdir nsg-generator-std nsg-generator-shr vnet-generator-std vnet-generator-shr
$ touch nsg-generator-std/main.tf nsg-generator-std/variables.tf
$ cp nsg-generator-std/*tf nsg-generator-shr
$ cp nsg-generator-std/*tf vnet-generator-std
$ cp nsg-generator-std/*tf vnet-generator-shr
```
After this commands the structure should be like this:
```
tf-modules
|-- virtual-network
    |-- nsg-generator-std
        |-- main.tf
        |-- variables.tf
    |-- nsg-generator-shr
        |-- main.tf
        |-- variables.tf
    |-- vnet-generator-std
        |-- main.tf
        |-- variables.tf
    |-- vnet-generator-shr
        |-- main.tf
        |-- variables.tf
    |-- main.tf
    |-- variables.tf
    |-- README.md
```

### 3. Create Network Security Groups

Before create the wrapper module, must be created submodules to provisioning Network Security Groups [NSG]. The _NSG_ it's a 
component to implement traffic rules for each network. The following steps will create each one:

#### 3.1 Create module _nsg-generator-std_
The Network Security Group Standard generator, will provide the rules to be applied on Development and 
Production environments.

That rules must implement the following rules:
1. All components in the same subnet and from shared can be connected by any port and protocol. 
2. Between other subnets, only be available connections by ports 22, 80, 443, 3306 e 5432 
3. All machines on Linux Subnet can be accessed by port 22 from any External IP 
4. All machines on Windows Subnet can be accessed by port 3389 from any External IP 
5. All of other connections will be blocked

---

**Note**: Read [Official documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group)

---

Implementation:

Edit file main.tf on folder **nsg-generator-std** and insert the following source:
##### Linux Rule (NSG):
```
resource "azurerm_network_security_group" "vnet_nsg_linux" {
    location = var.location # Location variable
    resource_group_name = var.resource_group_name # Resource group variable
    name = "${var.name}-${var.env}-nsg-vm-linux" # Composed name NameOfComponent-Environment-nsg-vm-linux

    security_rule = [ 
        # Inbound Rules
        # Allow inbound from all sources connections by port 22 
        {
            access = "Allow"
            description = "Allow ssh connections from anywhere"
            destination_address_prefix = null
            destination_address_prefixes = [ var.linux_vm_addr ] # Address will be affected
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = [ "22" ] # Ports allowed
            direction = "Inbound" # Direction
            name = "i-ssh-port-rule-${var.env}-linux"
            priority = 100 # Priority of rule
            protocol = "Tcp" # Protocol
            source_address_prefix = "*"
            source_address_prefixes = null
            source_application_security_group_ids = null
            source_port_range = null
            source_port_ranges = [ "22" ] # Source port
        },
        # Allow inbound connections from shared network
        {
            access = "Allow"
            description = "Allow subnet connections from subnet and shared"
            destination_address_prefix = null
            destination_address_prefixes = [ var.linux_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Inbound"
            name = "i-subnet-network-trafic-${var.env}-linux"
            priority = 110
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ # Source network to be applied this rule
                    var.linux_vm_addr,
                    var.shared_addr
                ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        # Allow inbound connections from other subnets on ports 22, 80, 443, 3306 and 5432
        {
            access = "Allow"
            description = "Allow subnets connections on ports 22, 80, 443, 3306 and 5432"
            destination_address_prefix = null
            destination_address_prefixes = [ var.linux_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = ["22", "80", "443", "3306", "5432"]
            direction = "Inbound"
            name = "i-subnets-network-trafic-${var.env}-linux"
            priority = 120
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ 
                    var.windows_vm_addr,
                    var.k8s_addr,
                    var.shared_addr 
                ]
            source_application_security_group_ids = null
            source_port_range = null
            source_port_ranges = ["22", "80", "443", "3306", "5432"]

        },
        # Block inbound others connections
        {
            access = "Deny"
            description = "Deny connections"
            destination_address_prefix = null
            destination_address_prefixes = [ var.linux_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Inbound"
            name = "i-deny-trafic-${var.env}-linux"
            priority = 200
            protocol = "*"
            source_address_prefix = "*"
            source_address_prefixes = null
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },

        # Outbound
        # Allow connections to ports 443 and 5000 to any destiny
        {
            access = "Allow"
            description = "Allow external https connections"
            destination_address_prefix = "*"
            destination_address_prefixes = null
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = [ "443", "5000" ]
            direction = "Outbound"
            name = "o-allow-external-https-connections-${var.env}-linux"
            priority = 100
            protocol = "Tcp"
            source_address_prefix = null
            source_address_prefixes = [ var.linux_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        # Allow Internal outbound connections 
        {
            access = "Allow"
            description = "Allow internal connections"
            destination_address_prefix = null
            destination_address_prefixes = [ 
                var.windows_vm_addr,
                var.k8s_addr,
                var.shared_addr
             ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Outbound"
            name = "o-allow-internal-connections-${var.env}-linux"
            priority = 110
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ var.linux_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        # Block other outbound connections type
        {
            access = "Deny"
            description = "Deny other connections"
            destination_address_prefix = "*"
            destination_address_prefixes = null
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Outbound"
            name = "o-deny-connections-${var.env}-linux"
            priority = 120
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ var.linux_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null

        }
        
    ]
}
```

---

##### Windows Rule (NSG):
```
resource "azurerm_network_security_group" "vnet_nsg_windows" {
    location = var.location
    resource_group_name = var.resource_group_name
    name = "${var.name}-${var.env}-nsg-vm-windows"

    # Inbound
    security_rule = [
        {
            access = "Allow"
            description = "Allow RDP connections from anywhere"
            destination_address_prefix = null
            destination_address_prefixes = [ var.windows_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = [ "3389" ]
            direction = "Inbound"
            name = "i-rdp-port-rule-${var.env}-windows"
            priority = 100
            protocol = "Tcp"
            source_address_prefix = "*"
            source_address_prefixes = null
            source_application_security_group_ids = null
            source_port_range = null
            source_port_ranges = [ "3389" ]
        },
        {
            access = "Allow"
            description = "Allow subnet connections from subnet and shared"
            destination_address_prefix = null
            destination_address_prefixes = [ var.windows_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Inbound"
            name = "i-subnet-network-trafic-${var.env}-windows"
            priority = 110
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ 
                    var.windows_vm_addr,
                    var.shared_addr
                ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Allow"
            description = "Allow subnets connections on ports 3389, 80, 443, 3306 and 5432"
            destination_address_prefix = null
            destination_address_prefixes = [ var.windows_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = ["3389", "80", "443", "3306", "5432"]
            direction = "Inbound"
            name = "i-subnets-network-trafic-${var.env}-windows"
            priority = 120
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ 
                    var.linux_vm_addr,
                    var.k8s_addr,
                    var.shared_addr 
                ]
            source_application_security_group_ids = null
            source_port_range = null
            source_port_ranges = ["3389", "80", "443", "3306", "5432"]

        },
        {
            access = "Deny"
            description = "Deny connections"
            destination_address_prefix = null
            destination_address_prefixes = [ var.windows_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Inbound"
            name = "i-deny-trafic-${var.env}-windows"
            priority = 200
            protocol = "*"
            source_address_prefix = "*"
            source_address_prefixes = null
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },

        # Outbound
        
        {
            access = "Allow"
            description = "Allow external https connections"
            destination_address_prefix = "*"
            destination_address_prefixes = null
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = [ "443", "5000" ]
            direction = "Outbound"
            name = "o-allow-external-https-connections-${var.env}-windows"
            priority = 100
            protocol = "Tcp"
            source_address_prefix = null
            source_address_prefixes = [ var.windows_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Allow"
            description = "Allow internal connections"
            destination_address_prefix = null
            destination_address_prefixes = [ 
                var.linux_vm_addr,
                var.k8s_addr,
                var.shared_addr
             ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Outbound"
            name = "o-allow-internal-connections-${var.env}-windows"
            priority = 110
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ var.windows_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Deny"
            description = "Deny other connections"
            destination_address_prefix = "*"
            destination_address_prefixes = null
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Outbound"
            name = "o-deny-connections-${var.env}-linux"
            priority = 120
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ var.windows_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null

        }
        
    ]
}
```

---

##### Kubernetes Rule (NSG):
```
resource "azurerm_network_security_group" "vnet_nsg_k8s" {
    location = var.location
    resource_group_name = var.resource_group_name
    name = "${var.name}-${var.env}-nsg-vm-k8s"

    # Inbound
    security_rule = [
        {
            access = "Allow"
            description = "Allow external access https"
            destination_address_prefix = null
            destination_address_prefixes = [ var.k8s_addr ]
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = [ "443" ]
            direction = "Inbound"
            name = "i-https-trafic-${var.env}-k8s"
            priority = 110
            protocol = "*"
            source_address_prefix = "*"
            source_address_prefixes = null
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Allow"
            description = "Allow subnet connections from subnets windows, linux and shared"
            destination_address_prefix = null
            destination_address_prefixes = [ var.k8s_addr ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Inbound"
            name = "i-subnet-network-trafic-${var.env}-k8s"
            priority = 120
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ 
                    var.windows_vm_addr,
                    var.linux_vm_addr,
                    var.shared_addr
                ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Deny"
            description = "Deny connections"
            destination_address_prefix = null
            destination_address_prefixes = [ var.windows_vm_addr ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Inbound"
            name = "i-subnets-network-trafic-${var.env}-k8s"
            priority = 200
            protocol = "*"
            source_address_prefix = "*"
            source_address_prefixes = null
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },

        # Outbound
        
        {
            access = "Allow"
            description = "Allow external https connections"
            destination_address_prefix = "*"
            destination_address_prefixes = null
            destination_application_security_group_ids = null
            destination_port_range = null
            destination_port_ranges = [ "443", "5000", "80" ]
            direction = "Outbound"
            name = "o-allow-external-https-connections-${var.env}-k8s"
            priority = 100
            protocol = "Tcp"
            source_address_prefix = null
            source_address_prefixes = [ var.windows_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Allow"
            description = "Allow internal connections"
            destination_address_prefix = null
            destination_address_prefixes = [ 
                var.linux_vm_addr,
                var.windows_vm_addr,
                var.shared_addr
             ]
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Outbound"
            name = "o-allow-internal-connections-${var.env}-k8s"
            priority = 110
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ var.windows_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null
        },
        {
            access = "Deny"
            description = "Deny other connections"
            destination_address_prefix = "*"
            destination_address_prefixes = null
            destination_application_security_group_ids = null
            destination_port_range = "*"
            destination_port_ranges = null
            direction = "Outbound"
            name = "o-deny-connections-${var.env}-k8s"
            priority = 120
            protocol = "*"
            source_address_prefix = null
            source_address_prefixes = [ var.windows_vm_addr ]
            source_application_security_group_ids = null
            source_port_range = "*"
            source_port_ranges = null

        }
        
    ]
}
```

---

The Terraform code, can be difficult to read if you don't have a declarative structure. 
Then the sources should be separe by files and the files names with declarative name. 
On that case, wil be used the most common naming in a lot of terraform modules:

- Implementations: main.tf (or submodules when needed)
- Variables: variables.tf

---

##### Variables file:
Edit file variables.tf on folder **nsg-generator-std** and insert the following lines of code:
```
variable "name" {
    type = string
}
variable "env" {
    type = string
}
variable "linux_vm_addr" {
    type = string 
}
variable "windows_vm_addr" {
    type = string 
}
variable "k8s_addr" {
    type = string 
}
variable "shared_addr" {
    type = string
}
variable "resource_group_name" {
    type = string
}
variable "location" {
    type = string
}
```

##### Outputs:
Will be need define outputs to orchestrate the component provisioning. When these modules are running, 
the created components will have some auto generated data required for example to attach that NSG on Virtual Networks, 
then must be created outputs to be used on following modules. On that example, will be returned the created NSG data, to 
do this will be added on main.tf file the following lines:

```
output "linux_nsg" {
    value = azurerm_network_security_group.vnet_nsg_linux
}
output "windows_nsg" {
    value = azurerm_network_security_group.vnet_nsg_windows
}
output "k8s_nsg" {
    value = azurerm_network_security_group.vnet_nsg_k8s
}
```

---

#### 3.2 Create module _nsg-generator-shr_

In a lot of architectures, can be needed a network with high privileges to be used as 
a host to the components with full access for each environment (on this case production and development).
The **Shared Network** should be covered that requirements.

These network will have two subnetworks with rules to support windows and linux environments.

Implementation:

Edit file main.tf on folder nsg-generator-std and insert the following source:

```
resource "azurerm_network_security_group" "vnet_nsg_shared" {
  location = var.location
  resource_group_name = var.resource_group_name
  name = "${var.name}-nsg-shared"

  # Inbound
  security_rule = [
      {
      access = "Allow"
      description = "Allow RDP and SSH connections from anywhere"
      destination_address_prefix = null
      destination_address_prefixes = var.shared_addr
      destination_application_security_group_ids = null
      destination_port_range = null
      destination_port_ranges = [ "3389", "22" ]
      direction = "Inbound"
      name = "i-rdp-ssh-port-rule-${var.env}"
      priority = 100
      protocol = "Tcp"
      source_address_prefix = "*"
      source_address_prefixes = null
      source_application_security_group_ids = null
      source_port_range = null
      source_port_ranges = [ "3389", "22" ]
      },
      {
      access = "Allow"
      description = "Allow all networks connections"
      destination_address_prefix = null
      destination_address_prefixes = var.shared_addr
      destination_application_security_group_ids = null
      destination_port_range = "*"
      destination_port_ranges = null
      direction = "Inbound"
      name = "i-subnet-network-trafic-${var.env}"
      priority = 110
      protocol = "*"
      source_address_prefix = null
      source_address_prefixes = setunion(
      var.dev_addr,
      var.prd_addr,
      var.shared_addr
      )
      source_application_security_group_ids = null
      source_port_range = "*"
      source_port_ranges = null
      },
      {
      access = "Deny"
      description = "Deny connections"
      destination_address_prefix = null
      destination_address_prefixes = var.shared_addr
      destination_application_security_group_ids = null
      destination_port_range = "*"
      destination_port_ranges = null
      direction = "Inbound"
      name = "i-subnets-network-trafic-${var.env}"
      priority = 200
      protocol = "*"
      source_address_prefix = "*"
      source_address_prefixes = null
      source_application_security_group_ids = null
      source_port_range = "*"
      source_port_ranges = null
      },
    
      # Outbound
    
      {
        access = "Allow"
        description = "Allow external https connections"
        destination_address_prefix = "*"
        destination_address_prefixes = null
        destination_application_security_group_ids = null
        destination_port_range = null
        destination_port_ranges = [ "443", "5000" ]
        direction = "Outbound"
        name = "o-allow-external-https-connections-${var.env}"
                priority = 100
                protocol = "Tcp"
        source_address_prefix = null
        source_address_prefixes = var.shared_addr
        source_application_security_group_ids = null
        source_port_range = "*"
        source_port_ranges = null
      },
      {
        access = "Allow"
        description = "Allow internal connections"
        destination_address_prefix = null
        destination_address_prefixes = setunion(
        var.dev_addr,
        var.prd_addr,
        var.shared_addr
        )
        destination_application_security_group_ids = null
        destination_port_range = "*"
        destination_port_ranges = null
        direction = "Outbound"
        name = "o-allow-internal-connections-${var.env}"
                priority = 110
                protocol = "*"
        source_address_prefix = null
        source_address_prefixes = var.shared_addr
        source_application_security_group_ids = null
        source_port_range = "*"
        source_port_ranges = null
      },
      {
        access = "Deny"
        description = "Deny other connections"
        destination_address_prefix = "*"
        destination_address_prefixes = null
        destination_application_security_group_ids = null
        destination_port_range = "*"
        destination_port_ranges = null
        direction = "Outbound"
        name = "o-deny-connections-${var.env}"
                priority = 120
                protocol = "*"
        source_address_prefix = null
        source_address_prefixes = var.shared_addr
        source_application_security_group_ids = null
        source_port_range = "*"
        source_port_ranges = null
    
      }
    ]
}
```

---

##### Variables file:
Edit file variables.tf on folder **nsg-generator-shr** and insert the following lines of code:
```
variable "name" {
    type = string
}
variable "dev_addr" {
    type = list(string)
}
variable "prd_addr" {
    type = list(string)
}
variable "shared_addr" {
    type = list(string)
}
variable "resource_group_name" {
    type = string
}
variable "location" {
    type = string
}
variable "env" {
    type = string
}
```

##### Outputs:
As the previous module, will be need implement outputs with the same logic:
```
output "shared_nsg" {
    value = azurerm_network_security_group.vnet_nsg_shared
}
```

---

### 4. Create Virtual Networks

This architecture (present on top of this tutorial) require three networks, one for each environment (development and production) 
and the shared network. Each environment networks will have three subnetworks to be a host for virtual machines Windows, 
Linux and Kubernetes Cluster. All subnetwork will have attached a NSG. 

To reach that target architecture will be created two modules, one module to create environment virtual networks (prod and dev) and another to
create shared network.

#### 4.1 Environment Virtual Networks
The submodule VNET STD (Networks Standard) will be used to provisioning the environment networks (Development and Production).

Edit main.tf on folder _vnet-generator-std_ (vnet-generator-std) and add the following source:
```
resource "azurerm_virtual_network" "vnet" {
    name = "${var.name}-${var.env}-vnet"
    resource_group_name = var.resource_group_name
    location = var.location
    
    address_space = [
      var.addr_linux,
      var.addr_windows,
      var.addr_k8s
    ]
    
    subnet {
      name = "${var.name}-${var.env}-linux-subnet"
      address_prefix = var.addr_linux
      security_group = var.linux_nsg_id
    }
    subnet {
      name = "${var.name}-${var.env}-windows-subnet"
      address_prefix = var.addr_windows
      security_group = var.windows_nsg_id
    }
    subnet {
      name = "${var.name}-${var.env}-k8s-subnet"
      address_prefix = var.addr_k8s
      security_group = var.k8s_nsg_id
    }
    
    tags = {
      environment = var.env
      product = var.name
      provisioner = "terraform"
    }
}

output "vnet" {
    value = azurerm_virtual_network.vnet
}
```
---

##### Variables file:
Edit the variables file on same directory and add the following lines:
```
variable "name" {
    type = string
}
variable "resource_group_name" {
    type = string
}
variable "location" {
    type = string
}
variable "env" {
    type = string
}
variable "addr_linux" {
    type = string
}
variable "linux_nsg_id" {
    type = string
}
variable "addr_windows" {
    type = string
}
variable "windows_nsg_id" {
    type = string
}
variable "addr_k8s" {
    type = string
}
variable "k8s_nsg_id" {
    type = string
}
```

#### 4.2 Create module _vnet-generator-shr_
The submodule VNET SHR (Networks Shared) will be used to provisioning the shared networks.

Edit main.tf on folder _vnet-generator-shr_ (vnet-generator-shr) and add the following source:
```
resource "azurerm_virtual_network" "vnet" {
    name = "${var.name}-${var.env}-vnet"
    resource_group_name = var.resource_group_name
    location = var.location

    address_space = [
        var.addr_linux,
        var.addr_windows
    ]

    subnet {
        name = "${var.name}-${var.env}-linux-subnet"
        address_prefix = var.addr_linux
        security_group = var.linux_nsg_id
    }
    subnet {
        name = "${var.name}-${var.env}-windows-subnet"
        address_prefix = var.addr_windows
        security_group = var.windows_nsg_id
    }

    tags = {
        environment = var.env
        product = var.name
        provisioner = "terraform"
    }
}

output "vnet" {
    value = azurerm_virtual_network.vnet
}
```

##### Variables file:
Edit the variables file on same directory and add the following lines:
```
variable "name" {
  type = string
}
  variable "resource_group_name" {
  type = string
}
  variable "location" {
  type = string
}
  variable "env" {
  type = string
}
  variable "addr_linux" {
  type = string
}
  variable "linux_nsg_id" {
  type = string
}
  variable "addr_windows" {
  type = string
}
  variable "windows_nsg_id" {
  type = string
}
```
### 5. Wrapper

After all submodules are created, will be need create a wrapper to be used. That wrapper will orchestrate all resources related to the networks,
to use this module will create:

**_(Add following lines on main.tf at the root of that project)_**
- **NSG-Development**
```
module "nsg_dev" {
  source = "./nsg-generator-std"
  name = var.name
  env = "dev"
  linux_vm_addr = var.subnets.dev.linux_vm.addr
  windows_vm_addr = var.subnets.dev.windows_vm.addr
  k8s_addr = var.subnets.dev.k8s.addr
  shared_addr = var.subnets.shr.linux_vm.addr
  resource_group_name = var.resource_group_name
  location = var.location
}
```
- **NSG-Production**
```
module "nsg_prd" {
  source = "./nsg-generator-std"
  name = var.name
  env = "prd"
  linux_vm_addr = var.subnets.prd.linux_vm.addr
  windows_vm_addr = var.subnets.prd.windows_vm.addr
  k8s_addr = var.subnets.prd.k8s.addr
  shared_addr = var.subnets.shr.linux_vm.addr
  resource_group_name = var.resource_group_name
  location = var.location
}
```
- **NSG-Shared**
```
module "nsg_shared" {
  source = "./nsg-generator-shr"
  name = var.name
  location = var.location
  env = "shr"
  resource_group_name = var.resource_group_name
  dev_addr = [var.subnets.dev.linux_vm.addr, var.subnets.dev.windows_vm.addr, var.subnets.dev.k8s.addr]
  shared_addr = [var.subnets.shr.linux_vm.addr, var.subnets.shr.windows_vm.addr]
  prd_addr = [var.subnets.prd.linux_vm.addr, var.subnets.prd.windows_vm.addr, var.subnets.prd.k8s.addr]
}
```
- **VNET-Development**
```
module "vnet_dev" {
  depends_on = [
  module.nsg_dev
  ]
  source = "./vnet-generator-std"
  name = var.name
  resource_group_name = var.resource_group_name
  location = var.location
  env = "dev"

  addr_linux = var.subnets.dev.linux_vm.addr
  addr_windows = var.subnets.dev.windows_vm.addr
  addr_k8s = var.subnets.dev.k8s.addr

  linux_nsg_id = module.nsg_dev.linux_nsg.id
  windows_nsg_id = module.nsg_dev.windows_nsg.id
  k8s_nsg_id = module.nsg_dev.k8s_nsg.id
}
```
- **VNET-Production**
```
module "vnet_prd" {
  depends_on = [
  module.nsg_prd
  ]
  source = "./vnet-generator-std"
  name = var.name
  resource_group_name = var.resource_group_name
  location = var.location
  env = "prd"

  addr_linux = var.subnets.prd.linux_vm.addr
  addr_windows = var.subnets.prd.windows_vm.addr
  addr_k8s = var.subnets.prd.k8s.addr

  linux_nsg_id = module.nsg_prd.linux_nsg.id
  windows_nsg_id = module.nsg_prd.windows_nsg.id
  k8s_nsg_id = module.nsg_prd.k8s_nsg.id
}
```
- **VNET-Shared**
```
module "vnet_shr" {
    depends_on = [
      module.nsg_shared
    ]
    source = "./vnet-generator-shr"
    
    name = var.name
    resource_group_name = var.resource_group_name
    location = var.location
    env = "shr"
 
    addr_linux = var.subnets.shr.linux_vm.addr
    addr_windows = var.subnets.shr.windows_vm.addr

    linux_nsg_id = module.nsg_shared.shared_nsg.id
    windows_nsg_id = module.nsg_shared.shared_nsg.id
}
```

#### Variables file:
```
variable "name" {
    type = string
}
variable "resource_group_name" {
    type = string
}
variable "location" {
    type = string
}
variable "subnets" {
    type = object({
        dev = object({
            linux_vm = object({
                addr = string
            })
            windows_vm = object({
                addr = string
            })
            k8s = object({
                addr = string
            })
        })
        prd = object({
            linux_vm = object({
                addr = string
            })
            windows_vm = object({
                addr = string
            })
            k8s = object({
                addr = string
            })
        })
        shr = object({
            linux_vm = object({
                addr = string
            })
            windows_vm = object({
                addr = string
            })
        })
    })
}
```

---

The outcome of previous tasks are stored on this [repository](https://github.com/jarpsimoes/tf-modules)

---
### 6. Implementation

The main goal of utilisation terraform module, it's a re-utilizable code. Modules should be generic to be used in another
implementations. The sources of modules can be stored in git repository, then on **source** option, inside module block
should be written the git url:

#### 6.1 Create main.tf
```
module "virtual_network" {
  source = "github.com/jarpsimoes/tf-modules/virtual-network"

  name = "operator-net"
  resource_group_name = "operator-lab-rg"
  location = "West Europe"

  subnets = {
    dev = {
      k8s = {
        addr = "10.1.0.0/16"
      }
      linux_vm = {
        addr = "10.0.0.0/24"
      }
      windows_vm = {
        addr = "10.0.1.0/24"
      }
    }
    prd = {
      k8s = {
        addr = "10.3.0.0/16"
      }
      linux_vm = {
        addr = "10.2.0.0/24"
      }
      windows_vm = {
        addr = "10.2.1.0/24"
      }
    }
    shr = {
      linux_vm = {
        addr = "10.4.0.0/24"
      }
      windows_vm = {
        addr = "10.4.1.0/24"
      }
    }
  }
}
```

#### 6.2 Execute

Initialize environment
```shell
$ terraform init
(...)
Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

Apply infrastructure
```shell
$ terraform apply -auto-approve
(...)
Apply complete! Resources: 10 added, 0 changed, 0 destroyed.
```

#### 6.3 Remove created infrastructure

Destroy infrastructure
```shell
$ terraform destroy -auto-approve
```
