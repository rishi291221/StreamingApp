pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        AWS_REGION = 'us-east-1'
        ACCOUNT_ID = '909884060498'
        EKS_CLUSTER = 'streaming-eks'

        K8S_NAMESPACE = 'streaming'
        HELM_NAMESPACE = 'default'
        HELM_RELEASE = 'streaming-app'

        ECR_REGISTRY = '909884060498.dkr.ecr.us-east-1.amazonaws.com'

        AUTH_REPO = 'streaming-auth'
        ADMIN_REPO = 'streaming-admin'
        CHAT_REPO = 'streaming-chat'
        STREAM_REPO = 'streaming-stream'
        FRONTEND_REPO = 'streaming-frontend'

        IMAGE_TAG = "${BUILD_NUMBER}"

        KUBECONFIG = "${WORKSPACE}/.kube/config"
    }

    stages {

        stage('Checkout Source') {
            steps {
                deleteDir()

                checkout scm

                sh '''
                    set -eu

                    echo "===== SOURCE CHECKOUT ====="

                    pwd
                    git branch --show-current || true
                    git log -1 --oneline

                    echo "Checking for unresolved Git conflicts..."

                    if grep -R \
                        --exclude-dir=.git \
                        --exclude=Jenkinsfile \
                        -E '^(<<<<<<<|=======|>>>>>>>)' .; then
                        echo "ERROR: Unresolved Git merge markers found."
                        exit 1
                    fi
                '''
            }
        }

        stage('Verify Repository Structure') {
            steps {
                sh '''
                    set -eu

                    echo "===== VERIFY REPOSITORY STRUCTURE ====="

                    test -d backend/authService
                    test -d backend/adminService
                    test -d backend/chatService
                    test -d backend/streamingService
                    test -d frontend

                    CHART_FILE=$(find . \
                        -type f \
                        -path '*/streaming-app/Chart.yaml' \
                        | head -n 1)

                    if [ -z "$CHART_FILE" ]; then
                        echo "ERROR: streaming-app/Chart.yaml was not found."
                        echo "Available Chart.yaml files:"
                        find . -type f -name Chart.yaml -print || true
                        exit 1
                    fi

                    CHART_DIR=$(dirname "$CHART_FILE")

                    echo "Helm chart found at: $CHART_DIR"

                    test -f "$CHART_DIR/Chart.yaml"
                    test -f "$CHART_DIR/values.yaml"
                    test -d "$CHART_DIR/templates"

                    ls -la "$CHART_DIR"
                '''
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                    set -eu

                    echo "===== TOOL VERSIONS ====="

                    git --version
                    docker --version
                    aws --version
                    kubectl version --client
                    helm version
                '''
            }
        }

        stage('Verify AWS Identity') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "===== VERIFY AWS IDENTITY ====="

                        unset AWS_SESSION_TOKEN

                        aws sts get-caller-identity

                        CURRENT_ACCOUNT=$(aws sts get-caller-identity \
                            --query Account \
                            --output text)

                        if [ "$CURRENT_ACCOUNT" != "$ACCOUNT_ID" ]; then
                            echo "ERROR: Jenkins authenticated to account $CURRENT_ACCOUNT"
                            echo "Expected account: $ACCOUNT_ID"
                            exit 1
                        fi

                        echo "AWS account verification successful."
                    '''
                }
            }
        }

        stage('ECR Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "===== ECR LOGIN ====="

                        unset AWS_SESSION_TOKEN

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -eu

                    echo "===== BUILD DOCKER IMAGES ====="
                    echo "Image tag: $IMAGE_TAG"

                    docker build \
                        --pull \
                        -t "$AUTH_REPO:$IMAGE_TAG" \
                        backend/authService

                    docker build \
                        --pull \
                        -t "$ADMIN_REPO:$IMAGE_TAG" \
                        backend/adminService

                    docker build \
                        --pull \
                        -t "$CHAT_REPO:$IMAGE_TAG" \
                        backend/chatService

                    docker build \
                        --pull \
                        -t "$STREAM_REPO:$IMAGE_TAG" \
                        backend/streamingService

                    docker build \
                        --pull \
                        -t "$FRONTEND_REPO:$IMAGE_TAG" \
                        frontend

                    echo "===== LOCAL IMAGES ====="

                    docker images \
                        --format '{{.Repository}}:{{.Tag}}' |
                    grep ":$IMAGE_TAG$"
                '''
            }
        }

        stage('Tag Docker Images') {
            steps {
                sh '''
                    set -eu

                    echo "===== TAG IMAGES FOR ECR ====="

                    docker tag \
                        "$AUTH_REPO:$IMAGE_TAG" \
                        "$ECR_REGISTRY/$AUTH_REPO:$IMAGE_TAG"

                    docker tag \
                        "$ADMIN_REPO:$IMAGE_TAG" \
                        "$ECR_REGISTRY/$ADMIN_REPO:$IMAGE_TAG"

                    docker tag \
                        "$CHAT_REPO:$IMAGE_TAG" \
                        "$ECR_REGISTRY/$CHAT_REPO:$IMAGE_TAG"

                    docker tag \
                        "$STREAM_REPO:$IMAGE_TAG" \
                        "$ECR_REGISTRY/$STREAM_REPO:$IMAGE_TAG"

                    docker tag \
                        "$FRONTEND_REPO:$IMAGE_TAG" \
                        "$ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG"
                '''
            }
        }

        stage('Push Images To ECR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "===== PUSH IMAGES TO ECR ====="

                        unset AWS_SESSION_TOKEN

                        aws sts get-caller-identity

                        docker push \
                            "$ECR_REGISTRY/$AUTH_REPO:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/$ADMIN_REPO:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/$CHAT_REPO:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/$STREAM_REPO:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG"
                    '''
                }
            }
        }

        stage('Connect To EKS') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "===== CONNECT TO EKS ====="

                        unset AWS_SESSION_TOKEN

                        mkdir -p "$(dirname "$KUBECONFIG")"

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        kubectl cluster-info
                        kubectl get nodes
                    '''
                }
            }
        }

        stage('Validate Helm Chart') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'mongodb-uri-priya',
                        variable: 'MONGODB_URI'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "===== VALIDATE HELM CHART ====="

                        CHART_FILE=$(find . \
                            -type f \
                            -path '*/streaming-app/Chart.yaml' \
                            | head -n 1)

                        if [ -z "$CHART_FILE" ]; then
                            echo "ERROR: streaming-app/Chart.yaml was not found."
                            exit 1
                        fi

                        CHART_DIR=$(dirname "$CHART_FILE")

                        echo "Using Helm chart: $CHART_DIR"

                        helm lint "$CHART_DIR" \
                            --set-string mongodb.uri="$MONGODB_URI" \
                            --set-string auth.tag="$IMAGE_TAG" \
                            --set-string admin.tag="$IMAGE_TAG" \
                            --set-string chat.tag="$IMAGE_TAG" \
                            --set-string streaming.tag="$IMAGE_TAG" \
                            --set-string frontend.tag="$IMAGE_TAG"

                        helm template \
                            "$HELM_RELEASE" \
                            "$CHART_DIR" \
                            --namespace "$HELM_NAMESPACE" \
                            --set-string mongodb.uri="$MONGODB_URI" \
                            --set-string auth.tag="$IMAGE_TAG" \
                            --set-string admin.tag="$IMAGE_TAG" \
                            --set-string chat.tag="$IMAGE_TAG" \
                            --set-string streaming.tag="$IMAGE_TAG" \
                            --set-string frontend.tag="$IMAGE_TAG" \
                            > rendered-streaming-app.yaml

                        test -s rendered-streaming-app.yaml

                        echo "Helm chart validation successful."
                    '''
                }
            }
        }

        stage('Deploy Helm') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    ),
                    string(
                        credentialsId: 'mongodb-uri-priya',
                        variable: 'MONGODB_URI'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "===== DEPLOY WITH HELM ====="

                        unset AWS_SESSION_TOKEN

                        mkdir -p "$(dirname "$KUBECONFIG")"

                        aws sts get-caller-identity

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        kubectl get nodes

                        CHART_FILE=$(find . \
                            -type f \
                            -path '*/streaming-app/Chart.yaml' \
                            | head -n 1)

                        if [ -z "$CHART_FILE" ]; then
                            echo "ERROR: streaming-app/Chart.yaml was not found."
                            exit 1
                        fi

                        CHART_DIR=$(dirname "$CHART_FILE")

                        echo "Chart directory: $CHART_DIR"
                        echo "Helm release namespace: $HELM_NAMESPACE"
                        echo "Application namespace: $K8S_NAMESPACE"
                        echo "Image tag: $IMAGE_TAG"

                        helm upgrade \
                            --install \
                            "$HELM_RELEASE" \
                            "$CHART_DIR" \
                            --namespace "$HELM_NAMESPACE" \
                            --set-string mongodb.uri="$MONGODB_URI" \
                            --set-string auth.tag="$IMAGE_TAG" \
                            --set-string admin.tag="$IMAGE_TAG" \
                            --set-string chat.tag="$IMAGE_TAG" \
                            --set-string streaming.tag="$IMAGE_TAG" \
                            --set-string frontend.tag="$IMAGE_TAG" \
                            --atomic \
                            --timeout 10m

                        helm status \
                            "$HELM_RELEASE" \
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
                        set -eu

                        echo "===== VERIFY KUBERNETES DEPLOYMENT ====="

                        unset AWS_SESSION_TOKEN

                        mkdir -p "$(dirname "$KUBECONFIG")"

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        kubectl rollout status \
                            deployment/auth \
                            --namespace "$K8S_NAMESPACE" \
                            --timeout=5m

                        kubectl rollout status \
                            deployment/admin \
                            --namespace "$K8S_NAMESPACE" \
                            --timeout=5m

                        kubectl rollout status \
                            deployment/chat \
                            --namespace "$K8S_NAMESPACE" \
                            --timeout=5m

                        kubectl rollout status \
                            deployment/streaming \
                            --namespace "$K8S_NAMESPACE" \
                            --timeout=5m

                        kubectl rollout status \
                            deployment/frontend \
                            --namespace "$K8S_NAMESPACE" \
                            --timeout=5m

                        echo "===== APPLICATION PODS ====="

                        kubectl get pods \
                            --namespace "$K8S_NAMESPACE" \
                            -o wide

                        echo "===== APPLICATION SERVICES ====="

                        kubectl get services \
                            --namespace "$K8S_NAMESPACE"

                        echo "===== HELM RELEASE ====="

                        helm list \
                            --namespace "$HELM_NAMESPACE"

                        echo "===== DEPLOYED IMAGES ====="

                        kubectl get deployments \
                            --namespace "$K8S_NAMESPACE" \
                            -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{range .spec.template.spec.containers[*]}{.image}{" "}{end}{"\n"}{end}'
                    '''
                }
            }
        }
    }

    post {

        success {
            echo """
==================================================
STREAMING APPLICATION DEPLOYMENT SUCCESSFUL

AWS account      : ${ACCOUNT_ID}
AWS region       : ${AWS_REGION}
EKS cluster      : ${EKS_CLUSTER}
Image tag        : ${IMAGE_TAG}
Helm release     : ${HELM_RELEASE}
Helm namespace   : ${HELM_NAMESPACE}
Application NS   : ${K8S_NAMESPACE}
==================================================
"""
        }

        failure {
            echo 'Deployment failed. Review the first failed Jenkins stage.'

            withCredentials([
                usernamePassword(
                    credentialsId: 'aws-secret-priya',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )
            ]) {
                sh '''
                    set +e

                    echo "===== FAILURE DIAGNOSTICS ====="

                    unset AWS_SESSION_TOKEN

                    mkdir -p "$(dirname "$KUBECONFIG")"

                    aws eks update-kubeconfig \
                        --region "$AWS_REGION" \
                        --name "$EKS_CLUSTER" \
                        --kubeconfig "$KUBECONFIG"

                    kubectl get nodes

                    kubectl get pods \
                        --namespace "$K8S_NAMESPACE" \
                        -o wide

                    kubectl get deployments \
                        --namespace "$K8S_NAMESPACE"

                    kubectl get services \
                        --namespace "$K8S_NAMESPACE"

                    kubectl get events \
                        --namespace "$K8S_NAMESPACE" \
                        --sort-by=.metadata.creationTimestamp

                    helm list \
                        --namespace "$HELM_NAMESPACE"
                '''
            }
        }

        always {
            sh '''
                docker logout "$ECR_REGISTRY" || true
            '''

            archiveArtifacts(
                artifacts: 'rendered-streaming-app.yaml',
                allowEmptyArchive: true
            )
        }
    }
}
