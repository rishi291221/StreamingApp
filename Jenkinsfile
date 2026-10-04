pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    environment {

        // ============================================================
        // AWS
        // ============================================================

        AWS_REGION = 'us-east-1'

        // StreamingApp AWS account
        AWS_ACCOUNT_ID = '206226812351'

        ECR_REGISTRY = '206226812351.dkr.ecr.us-east-1.amazonaws.com'


        // ============================================================
        // EKS
        // ============================================================

        EKS_CLUSTER = 'streamingapp-eks'

        K8S_NAMESPACE = 'streamingapp'

        HELM_NAMESPACE = 'streamingapp'

        HELM_RELEASE = 'streamingapp'


        // ============================================================
        // Image Tag
        // ============================================================

        IMAGE_TAG = "${BUILD_NUMBER}"


        // ============================================================
        // Kubernetes configuration
        // ============================================================

        KUBECONFIG = "${WORKSPACE}/.kube/config"
    }


    stages {


        // ============================================================
        // 1. CHECKOUT
        // ============================================================

        stage('Checkout') {

            steps {

                deleteDir()

                checkout scm

                sh '''
                    set -e

                    echo "========================================"
                    echo "Repository checkout completed"
                    echo "========================================"

                    echo ""
                    echo "Git commit:"
                    git rev-parse --short HEAD

                    echo ""
                    echo "Git branch:"
                    git branch --show-current || true

                    echo ""
                    echo "Repository structure:"
                    find . -maxdepth 4 -type f | sort
                '''
            }
        }


        // ============================================================
        // 2. VERIFY TOOLS
        // ============================================================

        stage('Verify Tools') {

            steps {

                sh '''
                    set -e

                    echo "========================================"
                    echo "Checking required tools"
                    echo "========================================"

                    echo ""
                    echo "Docker:"
                    docker --version

                    echo ""
                    echo "AWS CLI:"
                    aws --version

                    echo ""
                    echo "Kubectl:"
                    kubectl version --client

                    echo ""
                    echo "Helm:"
                    helm version

                    echo ""
                    echo "Git:"
                    git --version

                    echo ""
                    echo "All required tools are available."
                '''
            }
        }


        // ============================================================
        // 3. AWS LOGIN + ECR LOGIN
        // ============================================================

        stage('AWS And ECR Login') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "========================================"
                        echo "AWS authentication"
                        echo "========================================"

                        unset AWS_SESSION_TOKEN

                        echo ""
                        echo "Checking AWS identity..."

                        aws sts get-caller-identity

                        CURRENT_ACCOUNT=$(aws sts get-caller-identity \
                            --query Account \
                            --output text)

                        echo ""
                        echo "Expected AWS account: $AWS_ACCOUNT_ID"
                        echo "Current AWS account:  $CURRENT_ACCOUNT"

                        if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then

                            echo ""
                            echo "ERROR: Wrong AWS account."
                            echo "Expected: $AWS_ACCOUNT_ID"
                            echo "Actual:   $CURRENT_ACCOUNT"

                            exit 1
                        fi

                        echo ""
                        echo "AWS account verified successfully."


                        echo ""
                        echo "========================================"
                        echo "Logging into ECR"
                        echo "========================================"

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"

                        echo ""
                        echo "ECR login successful."
                    '''
                }
            }
        }


        // ============================================================
        // 4. VERIFY ECR REPOSITORIES
        // ============================================================

        stage('Verify ECR Repositories') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        unset AWS_SESSION_TOKEN

                        echo "========================================"
                        echo "Checking ECR repositories"
                        echo "========================================"


                        for REPOSITORY in \
                            streamingapp-auth \
                            streamingapp-admin \
                            streamingapp-chat \
                            streamingapp-streaming \
                            streamingapp-frontend
                        do

                            echo ""
                            echo "Checking: $REPOSITORY"

                            aws ecr describe-repositories \
                                --repository-names "$REPOSITORY" \
                                --region "$AWS_REGION" \
                                >/dev/null

                            echo "OK: $REPOSITORY"

                        done


                        echo ""
                        echo "All required ECR repositories exist."
                    '''
                }
            }
        }


        // ============================================================
        // 5. BUILD DOCKER IMAGES
        // ============================================================

        stage('Build Images') {

            steps {

                sh '''
                    set -e

                    echo "========================================"
                    echo "Building Docker images"
                    echo "========================================"

                    echo ""
                    echo "Image tag: $IMAGE_TAG"


                    echo ""
                    echo "Building Auth service..."

                    docker build \
                        -t streamingapp-auth:$IMAGE_TAG \
                        backend/authService


                    echo ""
                    echo "Building Admin service..."

                    docker build \
                        -t streamingapp-admin:$IMAGE_TAG \
                        backend/adminService


                    echo ""
                    echo "Building Chat service..."

                    docker build \
                        -t streamingapp-chat:$IMAGE_TAG \
                        backend/chatService


                    echo ""
                    echo "Building Streaming service..."

                    docker build \
                        -t streamingapp-streaming:$IMAGE_TAG \
                        backend/streamingService


                    echo ""
                    echo "Building Frontend..."

                    docker build \
                        -t streamingapp-frontend:$IMAGE_TAG \
                        frontend


                    echo ""
                    echo "========================================"
                    echo "Docker images created"
                    echo "========================================"

                    docker images | grep -E \
                        'streamingapp-(auth|admin|chat|streaming|frontend)'
                '''
            }
        }


        // ============================================================
        // 6. TAG + PUSH IMAGES TO ECR
        // ============================================================

        stage('Tag And Push Images') {

            steps {

                sh '''
                    set -e

                    echo "========================================"
                    echo "Tagging images"
                    echo "========================================"


                    docker tag \
                        streamingapp-auth:$IMAGE_TAG \
                        $ECR_REGISTRY/streamingapp-auth:$IMAGE_TAG


                    docker tag \
                        streamingapp-admin:$IMAGE_TAG \
                        $ECR_REGISTRY/streamingapp-admin:$IMAGE_TAG


                    docker tag \
                        streamingapp-chat:$IMAGE_TAG \
                        $ECR_REGISTRY/streamingapp-chat:$IMAGE_TAG


                    docker tag \
                        streamingapp-streaming:$IMAGE_TAG \
                        $ECR_REGISTRY/streamingapp-streaming:$IMAGE_TAG


                    docker tag \
                        streamingapp-frontend:$IMAGE_TAG \
                        $ECR_REGISTRY/streamingapp-frontend:$IMAGE_TAG


                    echo ""
                    echo "========================================"
                    echo "Pushing images to ECR"
                    echo "========================================"


                    docker push \
                        $ECR_REGISTRY/streamingapp-auth:$IMAGE_TAG


                    docker push \
                        $ECR_REGISTRY/streamingapp-admin:$IMAGE_TAG


                    docker push \
                        $ECR_REGISTRY/streamingapp-chat:$IMAGE_TAG


                    docker push \
                        $ECR_REGISTRY/streamingapp-streaming:$IMAGE_TAG


                    docker push \
                        $ECR_REGISTRY/streamingapp-frontend:$IMAGE_TAG


                    echo ""
                    echo "========================================"
                    echo "All images pushed successfully"
                    echo "========================================"
                '''
            }
        }


        // ============================================================
        // 7. CONFIGURE EKS
        // ============================================================

        stage('Configure EKS') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        unset AWS_SESSION_TOKEN

                        echo "========================================"
                        echo "Configuring EKS"
                        echo "========================================"


                        mkdir -p "$(dirname "$KUBECONFIG")"


                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"


                        echo ""
                        echo "Current Kubernetes context:"

                        kubectl config current-context


                        echo ""
                        echo "EKS nodes:"

                        kubectl get nodes -o wide


                        echo ""
                        echo "EKS connection successful."
                    '''
                }
            }
        }


        // ============================================================
        // 8. FIND HELM CHART
        // ============================================================

        stage('Find Helm Chart') {

            steps {

                sh '''
                    set -e

                    echo "========================================"
                    echo "Searching for Helm Chart"
                    echo "========================================"


                    CHART_COUNT=$(find . \
                        -type f \
                        -name 'Chart.yaml' \
                        -not -path './.git/*' \
                        | wc -l)


                    echo ""
                    echo "Chart.yaml files found: $CHART_COUNT"


                    if [ "$CHART_COUNT" -eq 0 ]; then

                        echo ""
                        echo "ERROR: No Helm Chart.yaml found."

                        echo ""
                        echo "Repository files:"

                        find . \
                            -maxdepth 6 \
                            -type f \
                            -not -path './.git/*' \
                            | sort

                        exit 1
                    fi


                    if [ "$CHART_COUNT" -gt 1 ]; then

                        echo ""
                        echo "WARNING: Multiple Helm charts found:"

                        find . \
                            -type f \
                            -name 'Chart.yaml' \
                            -not -path './.git/*' \
                            | sort

                        echo ""
                        echo "The first chart will be used."
                    fi


                    CHART_FILE=$(find . \
                        -type f \
                        -name 'Chart.yaml' \
                        -not -path './.git/*' \
                        | sort \
                        | head -n 1)


                    if [ -z "$CHART_FILE" ]; then

                        echo "ERROR: Could not determine Helm chart."

                        exit 1
                    fi


                    CHART_DIR=$(dirname "$CHART_FILE")


                    echo ""
                    echo "Helm Chart:"
                    echo "$CHART_FILE"

                    echo ""
                    echo "Helm Chart Directory:"
                    echo "$CHART_DIR"

                    echo ""
                    echo "Helm chart contents:"

                    find "$CHART_DIR" \
                        -maxdepth 3 \
                        -type f \
                        | sort


                    echo ""
                    echo "Helm chart discovery successful."
                '''
            }
        }


        // ============================================================
        // 9. VALIDATE HELM
        // ============================================================

        stage('Validate Helm Chart') {

            steps {

                sh '''
                    set -e

                    echo "========================================"
                    echo "Validating Helm Chart"
                    echo "========================================"


                    CHART_FILE=$(find . \
                        -type f \
                        -name 'Chart.yaml' \
                        -not -path './.git/*' \
                        | sort \
                        | head -n 1)


                    if [ -z "$CHART_FILE" ]; then

                        echo "ERROR: Chart.yaml not found."

                        exit 1
                    fi


                    CHART_DIR=$(dirname "$CHART_FILE")


                    echo ""
                    echo "Chart directory:"
                    echo "$CHART_DIR"


                    echo ""
                    echo "Running Helm lint..."

                    helm lint "$CHART_DIR"


                    echo ""
                    echo "Rendering Helm templates..."


                    helm template \
                        "$HELM_RELEASE" \
                        "$CHART_DIR" \
                        --namespace "$HELM_NAMESPACE" \
                        --set-string auth.tag="$IMAGE_TAG" \
                        --set-string admin.tag="$IMAGE_TAG" \
                        --set-string chat.tag="$IMAGE_TAG" \
                        --set-string streaming.tag="$IMAGE_TAG" \
                        --set-string frontend.tag="$IMAGE_TAG" \
                        >/tmp/streamingapp-rendered.yaml


                    echo ""
                    echo "Helm template rendered successfully."


                    echo ""
                    echo "Checking rendered images..."

                    grep -E \
                        'image:.*streamingapp-' \
                        /tmp/streamingapp-rendered.yaml || true


                    echo ""
                    echo "Helm validation successful."
                '''
            }
        }


        // ============================================================
        // 10. DEPLOY APPLICATION WITH HELM
        // ============================================================

        stage('Deploy To EKS') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        unset AWS_SESSION_TOKEN

                        echo "========================================"
                        echo "Deploying StreamingApp to EKS"
                        echo "========================================"


                        CHART_FILE=$(find . \
                            -type f \
                            -name 'Chart.yaml' \
                            -not -path './.git/*' \
                            | sort \
                            | head -n 1)


                        if [ -z "$CHART_FILE" ]; then

                            echo "ERROR: Helm Chart.yaml was not found."

                            exit 1
                        fi


                        CHART_DIR=$(dirname "$CHART_FILE")


                        echo ""
                        echo "Chart:     $CHART_DIR"
                        echo "Release:   $HELM_RELEASE"
                        echo "Namespace: $HELM_NAMESPACE"
                        echo "Tag:       $IMAGE_TAG"


                        helm upgrade \
                            --install \
                            "$HELM_RELEASE" \
                            "$CHART_DIR" \
                            --namespace "$HELM_NAMESPACE" \
                            --create-namespace \
                            --set-string auth.tag="$IMAGE_TAG" \
                            --set-string admin.tag="$IMAGE_TAG" \
                            --set-string chat.tag="$IMAGE_TAG" \
                            --set-string streaming.tag="$IMAGE_TAG" \
                            --set-string frontend.tag="$IMAGE_TAG" \
                            --atomic \
                            --timeout 10m \
                            --wait


                        echo ""
                        echo "========================================"
                        echo "Helm deployment completed"
                        echo "========================================"


                        helm list \
                            --namespace "$HELM_NAMESPACE"
                    '''
                }
            }
        }


        // ============================================================
        // 11. CHANGE FRONTEND SERVICE TO LOADBALANCER
        // ============================================================

        stage('Configure Frontend LoadBalancer') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        unset AWS_SESSION_TOKEN

                        echo "========================================"
                        echo "Configuring Frontend LoadBalancer"
                        echo "========================================"


                        echo ""
                        echo "Current services:"

                        kubectl get services \
                            -n "$K8S_NAMESPACE"


                        echo ""
                        echo "Changing frontend service to LoadBalancer..."


                        kubectl patch service frontend \
                            -n "$K8S_NAMESPACE" \
                            --type='merge' \
                            -p '{"spec":{"type":"LoadBalancer"}}'


                        echo ""
                        echo "Frontend service updated."


                        echo ""
                        echo "Frontend service:"

                        kubectl get service frontend \
                            -n "$K8S_NAMESPACE" \
                            -o wide
                    '''
                }
            }
        }


        // ============================================================
        // 12. WAIT FOR LOADBALANCER
        // ============================================================

        stage('Wait For LoadBalancer') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "========================================"
                        echo "Waiting for AWS LoadBalancer"
                        echo "========================================"


                        MAX_ATTEMPTS=30
                        ATTEMPT=1


                        while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]
                        do

                            echo ""
                            echo "Attempt $ATTEMPT of $MAX_ATTEMPTS"


                            LB_HOSTNAME=$(kubectl get service frontend \
                                -n "$K8S_NAMESPACE" \
                                -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' \
                                2>/dev/null || true)


                            LB_IP=$(kubectl get service frontend \
                                -n "$K8S_NAMESPACE" \
                                -o jsonpath='{.status.loadBalancer.ingress[0].ip}' \
                                2>/dev/null || true)


                            if [ -n "$LB_HOSTNAME" ]; then

                                echo ""
                                echo "========================================"
                                echo "LOAD BALANCER READY"
                                echo "========================================"

                                echo ""
                                echo "LoadBalancer hostname:"
                                echo "$LB_HOSTNAME"

                                echo ""
                                echo "Application URL:"
                                echo "http://$LB_HOSTNAME"

                                exit 0
                            fi


                            if [ -n "$LB_IP" ]; then

                                echo ""
                                echo "========================================"
                                echo "LOAD BALANCER READY"
                                echo "========================================"

                                echo ""
                                echo "LoadBalancer IP:"
                                echo "$LB_IP"

                                echo ""
                                echo "Application URL:"
                                echo "http://$LB_IP"

                                exit 0
                            fi


                            echo "LoadBalancer is still provisioning..."

                            kubectl get service frontend \
                                -n "$K8S_NAMESPACE" \
                                -o wide || true


                            sleep 20

                            ATTEMPT=$((ATTEMPT + 1))

                        done


                        echo ""
                        echo "ERROR: LoadBalancer was not ready within expected time."

                        echo ""
                        echo "Frontend service details:"

                        kubectl describe service frontend \
                            -n "$K8S_NAMESPACE" || true


                        exit 1
                    '''
                }
            }
        }


        // ============================================================
        // 13. VERIFY DEPLOYMENT
        // ============================================================

        stage('Verify Deployment') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        unset AWS_SESSION_TOKEN

                        echo "========================================"
                        echo "Verifying Kubernetes deployment"
                        echo "========================================"


                        echo ""
                        echo "========================================"
                        echo "Deployments"
                        echo "========================================"

                        kubectl get deployments \
                            -n "$K8S_NAMESPACE" \
                            -o wide


                        echo ""
                        echo "========================================"
                        echo "Pods"
                        echo "========================================"

                        kubectl get pods \
                            -n "$K8S_NAMESPACE" \
                            -o wide


                        echo ""
                        echo "========================================"
                        echo "Services"
                        echo "========================================"

                        kubectl get services \
                            -n "$K8S_NAMESPACE" \
                            -o wide


                        echo ""
                        echo "========================================"
                        echo "Rollout status"
                        echo "========================================"


                        kubectl rollout status \
                            deployment/auth \
                            -n "$K8S_NAMESPACE" \
                            --timeout=5m


                        kubectl rollout status \
                            deployment/admin \
                            -n "$K8S_NAMESPACE" \
                            --timeout=5m


                        kubectl rollout status \
                            deployment/chat \
                            -n "$K8S_NAMESPACE" \
                            --timeout=5m


                        kubectl rollout status \
                            deployment/streaming \
                            -n "$K8S_NAMESPACE" \
                            --timeout=5m


                        kubectl rollout status \
                            deployment/frontend \
                            -n "$K8S_NAMESPACE" \
                            --timeout=5m


                        echo ""
                        echo "========================================"
                        echo "Final Application Status"
                        echo "========================================"


                        kubectl get pods \
                            -n "$K8S_NAMESPACE"


                        echo ""
                        kubectl get services \
                            -n "$K8S_NAMESPACE" \
                            -o wide


                        echo ""
                        echo "========================================"
                        echo "Frontend LoadBalancer"
                        echo "========================================"


                        kubectl get service frontend \
                            -n "$K8S_NAMESPACE" \
                            -o wide


                        LB_HOSTNAME=$(kubectl get service frontend \
                            -n "$K8S_NAMESPACE" \
                            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' \
                            2>/dev/null || true)


                        LB_IP=$(kubectl get service frontend \
                            -n "$K8S_NAMESPACE" \
                            -o jsonpath='{.status.loadBalancer.ingress[0].ip}' \
                            2>/dev/null || true)


                        if [ -n "$LB_HOSTNAME" ]; then

                            echo ""
                            echo "========================================"
                            echo "APPLICATION URL"
                            echo "========================================"

                            echo "http://$LB_HOSTNAME"

                        elif [ -n "$LB_IP" ]; then

                            echo ""
                            echo "========================================"
                            echo "APPLICATION URL"
                            echo "========================================"

                            echo "http://$LB_IP"

                        else

                            echo ""
                            echo "WARNING: LoadBalancer hostname/IP not available."

                        fi


                        echo ""
                        echo "========================================"
                        echo "Helm Release"
                        echo "========================================"

                        helm list \
                            -n "$HELM_NAMESPACE"


                        echo ""
                        echo "========================================"
                        echo "Deployment verification successful"
                        echo "========================================"
                    '''
                }
            }
        }
    }


    // ================================================================
    // POST ACTIONS
    // ================================================================

    post {


        success {

            echo """
========================================
STREAMINGAPP DEPLOYMENT SUCCESSFUL
========================================

Image tag:  ${IMAGE_TAG}
EKS:        ${EKS_CLUSTER}
Namespace:  ${K8S_NAMESPACE}
Helm:       ${HELM_RELEASE}

The application was successfully deployed.
The frontend LoadBalancer was configured.
========================================
"""
        }


        failure {

            echo """
========================================
STREAMINGAPP DEPLOYMENT FAILED
========================================

Check the FIRST failed stage in the Jenkins Console.

Important areas to check:

1. AWS credentials
2. ECR repositories
3. Docker build
4. ECR push
5. EKS connection
6. Helm validation
7. Helm deployment
8. Kubernetes pods
9. Frontend LoadBalancer

========================================
"""
        }


        always {

            sh '''
                echo "========================================"
                echo "Cleaning up"
                echo "========================================"


                docker logout "$ECR_REGISTRY" || true


                echo ""
                echo "Removing local build images..."


                docker rmi \
                    streamingapp-auth:$IMAGE_TAG \
                    streamingapp-admin:$IMAGE_TAG \
                    streamingapp-chat:$IMAGE_TAG \
                    streamingapp-streaming:$IMAGE_TAG \
                    streamingapp-frontend:$IMAGE_TAG \
                    2>/dev/null || true


                echo ""
                echo "Removing ECR-tagged local images..."


                docker rmi \
                    $ECR_REGISTRY/streamingapp-auth:$IMAGE_TAG \
                    $ECR_REGISTRY/streamingapp-admin:$IMAGE_TAG \
                    $ECR_REGISTRY/streamingapp-chat:$IMAGE_TAG \
                    $ECR_REGISTRY/streamingapp-streaming:$IMAGE_TAG \
                    $ECR_REGISTRY/streamingapp-frontend:$IMAGE_TAG \
                    2>/dev/null || true


                echo ""
                echo "Cleanup completed."
            '''
        }
    }
}
