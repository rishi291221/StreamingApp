module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = var.cluster_name
  kubernetes_version = var.cluster_version

  vpc_id = "vpc-090e843ff029e2b00"

  subnet_ids = [
    "subnet-0837b71566d0c3e0e",
    "subnet-0ebae23b5e7a11177",
    "subnet-09abe28c9e995ef29"
  ]

  endpoint_public_access = true

  eks_managed_node_groups = {
  default = {
    instance_types = ["t3.small"]

    min_size     = 1
    max_size     = 1
    desired_size = 1
  }
  }
  }
