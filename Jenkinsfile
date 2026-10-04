pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
    }

    environment {
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = '909884060498'
        ECR_REGISTRY = '909884060498.dkr.ecr.us-east-1.amazonaws.com'

        EKS_CLUSTER = 'streaming-eks'
        K8S_NAMESPACE = 'streaming'

        HELM_RELEASE = 'streaming-app'
        HELM_NAMESPACE = 'default'

        IMAGE_TAG = "${BUILD_NUMBER}"

        KUBECONFIG = "${WORKSPACE}/.kube/config"
    }

    stages {

        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                    set -e

                    docker --version
                    aws --version
                    kubectl version --client
                    helm version
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

                        unset AWS_SESSION_TOKEN

                        aws sts get-caller-identity

                        CURRENT_ACCOUNT=$(aws sts get-caller-identity \
                            --query Account \
                            --output text)

                        if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
                            echo "Wrong AWS account: $CURRENT_ACCOUNT"
                            exit 1
                        fi

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"
                    '''
                }
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -e

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
                '''
            }
        }

        stage('Tag And Push Images') {
            steps {
                sh '''
                    set -e

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

                        mkdir -p "$(dirname "$KUBECONFIG")"

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
                            echo "Helm Chart.yaml was not found"
                            exit 1
                        fi

                        CHART_DIR=$(dirname "$CHART_FILE")

                        echo "Helm chart: $CHART_DIR"
                        echo "Image tag: $IMAGE_TAG"

                        helm lint "$CHART_DIR"

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
                            --timeout 10m
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

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

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

                        kubectl get pods -n "$K8S_NAMESPACE"
                        kubectl get services -n "$K8S_NAMESPACE"
                        helm list -n "$HELM_NAMESPACE"
                    '''
                }
            }
        }
    }

    post {

        success {
            echo "Deployment successful. Image tag: ${IMAGE_TAG}"
        }

        failure {
            echo 'Deployment failed. Check the first failed stage.'
        }

        always {
            sh '''
                docker logout "$ECR_REGISTRY" || true
            '''
        }
    }
}
