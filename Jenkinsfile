pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = '909884060498'
        ECR_REGISTRY = '909884060498.dkr.ecr.us-east-1.amazonaws.com'

        EKS_CLUSTER = 'streaming-eks'
        K8S_NAMESPACE = 'streaming'

        // Existing Helm release is stored in default.
        HELM_NAMESPACE = 'default'
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
                    set -eu

                    echo "===== SOURCE CHECKOUT ====="
                    pwd
                    git log -1 --oneline

                    echo "Checking for unresolved merge markers..."

                    if grep -R \
                        --exclude-dir=.git \
                        -E '^(<<<<<<<|=======|>>>>>>>)' .; then
                        echo "ERROR: Unresolved Git merge markers found."
                        exit 1
                    fi
                '''
            }
        }

        stage('Verify Project') {
            steps {
                sh '''
                    set -eu

                    echo "===== VERIFY PROJECT STRUCTURE ====="

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
                        find . -type f -name Chart.yaml -print || true
                        exit 1
                    fi

                    CHART_DIR=$(dirname "$CHART_FILE")

                    test -f "$CHART_DIR/values.yaml"
                    test -d "$CHART_DIR/templates"

                    echo "Helm chart found at: $CHART_DIR"
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

        stage('AWS Identity And ECR Login') {
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

                        unset AWS_SESSION_TOKEN

                        echo "===== VERIFY AWS IDENTITY ====="

                        aws sts get-caller-identity

                        CURRENT_ACCOUNT=$(aws sts get-caller-identity \
                            --query Account \
                            --output text)

                        if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
                            echo "ERROR: Jenkins authenticated to AWS account $CURRENT_ACCOUNT"
                            echo "Expected AWS account: $AWS_ACCOUNT_ID"
                            exit 1
                        fi

                        echo "===== ECR LOGIN ====="

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"

                        echo "AWS identity and ECR login verified."
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
                        set -eu

                        unset AWS_SESSION_TOKEN

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
                        done

                        echo "All required ECR repositories exist."
                    '''
                }
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -eu

                    echo "===== BUILD DOCKER IMAGES ====="
                    echo "Image tag: $IMAGE_TAG"

                    docker build \
                        -t streaming-auth:"$IMAGE_TAG" \
                        backend/authService

                    docker build \
                        -t streaming-admin:"$IMAGE_TAG" \
                        backend/adminService

                    docker build \
                        -t streaming-chat:"$IMAGE_TAG" \
                        backend/chatService

                    docker build \
                        -t streaming-stream:"$IMAGE_TAG" \
                        backend/streamingService

                    docker build \
                        -t streaming-frontend:"$IMAGE_TAG" \
                        frontend
                '''
            }
        }

        stage('Tag And Push Images') {
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

                        unset AWS_SESSION_TOKEN

                        echo "===== REFRESH ECR LOGIN ====="

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"

                        echo "===== TAG IMAGES ====="

                        docker tag \
                            streaming-auth:"$IMAGE_TAG" \
                            "$ECR_REGISTRY/streaming-auth:$IMAGE_TAG"

                        docker tag \
                            streaming-admin:"$IMAGE_TAG" \
                            "$ECR_REGISTRY/streaming-admin:$IMAGE_TAG"

                        docker tag \
                            streaming-chat:"$IMAGE_TAG" \
                            "$ECR_REGISTRY/streaming-chat:$IMAGE_TAG"

                        docker tag \
                            streaming-stream:"$IMAGE_TAG" \
                            "$ECR_REGISTRY/streaming-stream:$IMAGE_TAG"

                        docker tag \
                            streaming-frontend:"$IMAGE_TAG" \
                            "$ECR_REGISTRY/streaming-frontend:$IMAGE_TAG"

                        echo "===== PUSH IMAGES ====="

                        docker push \
                            "$ECR_REGISTRY/streaming-auth:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/streaming-admin:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/streaming-chat:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/streaming-stream:$IMAGE_TAG"

                        docker push \
                            "$ECR_REGISTRY/streaming-frontend:$IMAGE_TAG"
                    '''
                }
            }
        }

        stage('Validate Helm Chart') {
            steps {
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

                    echo "Chart directory: $CHART_DIR"

                    helm lint "$CHART_DIR"

                    helm template \
                        "$HELM_RELEASE" \
                        "$CHART_DIR" \
                        --namespace "$HELM_NAMESPACE" \
                        --set-string auth.tag="$IMAGE_TAG" \
                        --set-string admin.tag="$IMAGE_TAG" \
                        --set-string chat.tag="$IMAGE_TAG" \
                        --set-string streaming.tag="$IMAGE_TAG" \
                        --set-string frontend.tag="$IMAGE_TAG" \
                        > rendered-streaming-app.yaml

                    test -s rendered-streaming-app.yaml

                    echo "Helm chart validation passed."
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
                        set -eu

                        unset AWS_SESSION_TOKEN

                        echo "===== CONFIGURE EKS ACCESS ====="

                        mkdir -p "$(dirname "$KUBECONFIG")"

                        aws sts get-caller-identity

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        kubectl cluster-info
                        kubectl get nodes

                        echo "===== LOCATE HELM CHART ====="

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
                        echo "Image tag: $IMAGE_TAG"

                        echo "===== HELM DEPLOYMENT ====="

                        helm upgrade \
                            --install \
                            "$HELM_RELEASE" \
                            "$CHART_DIR" \
                            --namespace "$HELM_NAMESPACE" \
                            --set-string auth.tag="$IMAGE_TAG" \
                            --set-string admin.tag="$IMAGE_TAG" \
                            --set-string chat.tag="$IMAGE_TAG" \
                            --set-string streaming.tag="$IMAGE_TAG" \
                            --set-string frontend.tag="$IMAGE_TAG" \
                            --atomic \
                            --wait \
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

                        unset AWS_SESSION_TOKEN

                        echo "===== REFRESH EKS ACCESS ====="

                        mkdir -p "$(dirname "$KUBECONFIG")"

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        echo "===== VERIFY ROLLOUTS ====="

                        for DEPLOYMENT in \
                            auth \
                            admin \
                            chat \
                            streaming \
                            frontend
                        do
                            kubectl rollout status \
                                deployment/"$DEPLOYMENT" \
                                --namespace "$K8S_NAMESPACE" \
                                --timeout=5m
                        done

                        echo "===== PODS ====="

                        kubectl get pods \
                            --namespace "$K8S_NAMESPACE" \
                            -o wide

                        echo "===== SERVICES ====="

                        kubectl get services \
                            --namespace "$K8S_NAMESPACE"

                        echo "===== DEPLOYED IMAGES ====="

                        kubectl get deployments \
                            --namespace "$K8S_NAMESPACE" \
                            -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{range .spec.template.spec.containers[*]}{.image}{" "}{end}{"\n"}{end}'

                        echo "===== HELM RELEASE ====="

                        helm list \
                            --namespace "$HELM_NAMESPACE"
                    '''
                }
            }
        }
    }

    post {

        success {
            echo """
========================================
DEPLOYMENT SUCCESSFUL
========================================
AWS account    : ${AWS_ACCOUNT_ID}
EKS cluster    : ${EKS_CLUSTER}
Image tag      : ${IMAGE_TAG}
Application NS : ${K8S_NAMESPACE}
Helm release   : ${HELM_RELEASE}
Helm namespace : ${HELM_NAMESPACE}
========================================
"""
        }

        failure {
            echo 'Deployment failed. Check the first failed Jenkins stage.'
        }

        always {
            sh '''
                docker logout "$ECR_REGISTRY" || true

                docker rmi \
                    streaming-auth:"$IMAGE_TAG" \
                    streaming-admin:"$IMAGE_TAG" \
                    streaming-chat:"$IMAGE_TAG" \
                    streaming-stream:"$IMAGE_TAG" \
                    streaming-frontend:"$IMAGE_TAG" \
                    "$ECR_REGISTRY/streaming-auth:$IMAGE_TAG" \
                    "$ECR_REGISTRY/streaming-admin:$IMAGE_TAG" \
                    "$ECR_REGISTRY/streaming-chat:$IMAGE_TAG" \
                    "$ECR_REGISTRY/streaming-stream:$IMAGE_TAG" \
                    "$ECR_REGISTRY/streaming-frontend:$IMAGE_TAG" \
                    2>/dev/null || true
            '''

            archiveArtifacts(
                artifacts: 'rendered-streaming-app.yaml',
                allowEmptyArchive: true
            )
        }
    }
}
``
