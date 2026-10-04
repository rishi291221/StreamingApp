pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    environment {
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = '909884060498'
        ECR_REGISTRY = '909884060498.dkr.ecr.us-east-1.amazonaws.com'

        EKS_CLUSTER = 'streaming-eks'

        // Keep Helm and Kubernetes in the same namespace
        K8S_NAMESPACE = 'streaming'
        HELM_NAMESPACE = 'streaming'
        HELM_RELEASE = 'streaming-app'

        IMAGE_TAG = "${BUILD_NUMBER}"

        KUBECONFIG = "${WORKSPACE}/.kube/config"
    }

    stages {

        stage('Checkout') {
            steps {
                deleteDir()

                checkout scm

                sh '''
                    set -e

                    echo "========================================"
                    echo "Repository checkout completed"
                    echo "========================================"

                    git rev-parse --short HEAD
                    git branch --show-current || true

                    echo ""
                    echo "Repository structure:"
                    find . -maxdepth 4 -type f | sort
                '''
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                    set -e

                    echo "========================================"
                    echo "Checking required tools"
                    echo "========================================"

                    docker --version
                    aws --version
                    kubectl version --client
                    helm version
                    git --version
                '''
            }
        }

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

                        aws sts get-caller-identity

                        CURRENT_ACCOUNT=$(aws sts get-caller-identity \
                            --query Account \
                            --output text)

                        if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
                            echo "ERROR: Wrong AWS account"
                            echo "Expected: $AWS_ACCOUNT_ID"
                            echo "Actual:   $CURRENT_ACCOUNT"
                            exit 1
                        fi

                        echo "AWS account verified: $CURRENT_ACCOUNT"

                        echo ""
                        echo "Logging into ECR..."

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"

                        echo "ECR login successful"
                    '''
                }
            }
        }

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
                            streaming-auth \
                            streaming-admin \
                            streaming-chat \
                            streaming-stream \
                            streaming-frontend
                        do
                            echo "Checking ECR repository: $REPOSITORY"

                            aws ecr describe-repositories \
                                --repository-names "$REPOSITORY" \
                                --region "$AWS_REGION" \
                                >/dev/null

                            echo "OK: $REPOSITORY"
                        done

                        echo "All ECR repositories exist"
                    '''
                }
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -e

                    echo "========================================"
                    echo "Building Docker images"
                    echo "Image tag: $IMAGE_TAG"
                    echo "========================================"

                    docker build \
                        -t streaming-auth:$IMAGE_TAG \
                        backend/authService

                    docker build \
                        -t streaming-admin:$IMAGE_TAG \
                        backend/adminService

                    docker build \
                        -t streaming-chat:$IMAGE_TAG \
                        backend/chatService

                    docker build \
                        -t streaming-stream:$IMAGE_TAG \
                        backend/streamingService

                    docker build \
                        -t streaming-frontend:$IMAGE_TAG \
                        frontend

                    echo ""
                    echo "Docker images created:"
                    docker images | grep -E \
                        'streaming-(auth|admin|chat|stream|frontend)'
                '''
            }
        }

        stage('Tag And Push Images') {
            steps {
                sh '''
                    set -e

                    echo "========================================"
                    echo "Tagging Docker images"
                    echo "========================================"

                    docker tag \
                        streaming-auth:$IMAGE_TAG \
                        $ECR_REGISTRY/streaming-auth:$IMAGE_TAG

                    docker tag \
                        streaming-admin:$IMAGE_TAG \
                        $ECR_REGISTRY/streaming-admin:$IMAGE_TAG

                    docker tag \
                        streaming-chat:$IMAGE_TAG \
                        $ECR_REGISTRY/streaming-chat:$IMAGE_TAG

                    docker tag \
                        streaming-stream:$IMAGE_TAG \
                        $ECR_REGISTRY/streaming-stream:$IMAGE_TAG

                    docker tag \
                        streaming-frontend:$IMAGE_TAG \
                        $ECR_REGISTRY/streaming-frontend:$IMAGE_TAG

                    echo "========================================"
                    echo "Pushing images to ECR"
                    echo "========================================"

                    docker push \
                        $ECR_REGISTRY/streaming-auth:$IMAGE_TAG

                    docker push \
                        $ECR_REGISTRY/streaming-admin:$IMAGE_TAG

                    docker push \
                        $ECR_REGISTRY/streaming-chat:$IMAGE_TAG

                    docker push \
                        $ECR_REGISTRY/streaming-stream:$IMAGE_TAG

                    docker push \
                        $ECR_REGISTRY/streaming-frontend:$IMAGE_TAG

                    echo ""
                    echo "All images pushed successfully."
                '''
            }
        }

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
                        echo "Testing Kubernetes connection..."

                        kubectl get nodes

                        echo ""
                        echo "EKS connection successful."
                    '''
                }
            }
        }

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

                    echo "Chart.yaml files found: $CHART_COUNT"

                    if [ "$CHART_COUNT" -eq 0 ]; then
                        echo ""
                        echo "ERROR: No Helm Chart.yaml found."
                        echo ""
                        echo "Files in repository:"
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
                    echo "Chart contents:"
                    find "$CHART_DIR" \
                        -maxdepth 3 \
                        -type f \
                        | sort

                    echo ""
                    echo "Helm chart discovery successful."
                '''
            }
        }

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
                        echo "ERROR: Chart.yaml not found"
                        exit 1
                    fi

                    CHART_DIR=$(dirname "$CHART_FILE")

                    echo "Chart directory: $CHART_DIR"

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
                        >/tmp/streaming-rendered.yaml

                    echo ""
                    echo "Helm validation successful."
                '''
            }
        }

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
                        echo "Deploying application to EKS"
                        echo "========================================"

                        CHART_FILE=$(find . \
                            -type f \
                            -name 'Chart.yaml' \
                            -not -path './.git/*' \
                            | sort \
                            | head -n 1)

                        if [ -z "$CHART_FILE" ]; then
                            echo "ERROR: Helm Chart.yaml was not found"
                            exit 1
                        fi

                        CHART_DIR=$(dirname "$CHART_FILE")

                        echo "Chart: $CHART_DIR"
                        echo "Release: $HELM_RELEASE"
                        echo "Namespace: $HELM_NAMESPACE"
                        echo "Image tag: $IMAGE_TAG"

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
                        echo "Helm deployment completed successfully."

                        echo ""
                        echo "Helm release:"
                        helm list \
                            --namespace "$HELM_NAMESPACE"
                    '''
                }
            }
        }

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
                        echo "Deployments:"
                        kubectl get deployments \
                            -n "$K8S_NAMESPACE" \
                            -o wide

                        echo ""
                        echo "Pods:"
                        kubectl get pods \
                            -n "$K8S_NAMESPACE" \
                            -o wide

                        echo ""
                        echo "Services:"
                        kubectl get services \
                            -n "$K8S_NAMESPACE"

                        echo ""
                        echo "Checking deployment rollouts..."

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
                        echo "Deployment verification successful"
                        echo "========================================"

                        kubectl get pods \
                            -n "$K8S_NAMESPACE"

                        echo ""
                        kubectl get services \
                            -n "$K8S_NAMESPACE"

                        echo ""
                        helm list \
                            -n "$HELM_NAMESPACE"
                    '''
                }
            }
        }
    }

    post {

        success {
            echo "========================================"
            echo "DEPLOYMENT SUCCESSFUL"
            echo "========================================"
            echo "Image tag: ${IMAGE_TAG}"
            echo "EKS cluster: ${EKS_CLUSTER}"
            echo "Namespace: ${K8S_NAMESPACE}"
            echo "Helm release: ${HELM_RELEASE}"
        }

        failure {
            echo "========================================"
            echo "DEPLOYMENT FAILED"
            echo "========================================"
            echo "Check the first failed stage in the Jenkins console."
        }

        always {
            sh '''
                echo "Cleaning up Docker/ECR credentials..."

                docker logout "$ECR_REGISTRY" || true

                echo "Removing local build images..."

                docker rmi \
                    streaming-auth:$IMAGE_TAG \
                    streaming-admin:$IMAGE_TAG \
                    streaming-chat:$IMAGE_TAG \
                    streaming-stream:$IMAGE_TAG \
                    streaming-frontend:$IMAGE_TAG \
                    2>/dev/null || true

                docker rmi \
                    $ECR_REGISTRY/streaming-auth:$IMAGE_TAG \
                    $ECR_REGISTRY/streaming-admin:$IMAGE_TAG \
                    $ECR_REGISTRY/streaming-chat:$IMAGE_TAG \
                    $ECR_REGISTRY/streaming-stream:$IMAGE_TAG \
                    $ECR_REGISTRY/streaming-frontend:$IMAGE_TAG \
                    2>/dev/null || true
            '''
        }
    }
}
