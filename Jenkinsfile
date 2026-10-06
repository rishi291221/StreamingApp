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

        CHART_DIR = 'helm/streaming-app'
    }

    stages {

        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm

                sh '''
                    set -eu

                    echo "===== CHECKOUT ====="
                    git log -1 --oneline
                    git branch --show-current || true

                    test -f Jenkinsfile
                    test -d backend/authService
                    test -d backend/adminService
                    test -d backend/chatService
                    test -d backend/streamingService
                    test -d frontend

                    test -f "$CHART_DIR/Chart.yaml"
                    test -f "$CHART_DIR/values.yaml"
                    test -d "$CHART_DIR/templates"

                    echo "Repository structure verified."
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

                        echo "===== AWS IDENTITY ====="

                        aws sts get-caller-identity

                        CURRENT_ACCOUNT=$(aws sts get-caller-identity \
                            --query Account \
                            --output text)

                        if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
                            echo "ERROR: Jenkins is using AWS account $CURRENT_ACCOUNT"
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

                        echo "===== VERIFY ECR REPOSITORIES ====="

                        for REPOSITORY in \
                            streaming-auth \
                            streaming-admin \
                            streaming-chat \
                            streaming-stream \
                            streaming-frontend
                        do
                            echo "Checking $REPOSITORY"

                            aws ecr describe-repositories \
                                --repository-names "$REPOSITORY" \
                                --region "$AWS_REGION" \
                                >/dev/null
                        done

                        echo "All ECR repositories exist."
                    '''
                }
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -eu

                    echo "===== BUILD IMAGES ====="
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

                    echo "All five Docker images built."
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

                        echo "All images pushed to ECR."
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

                        echo "===== HELM VALIDATION ====="

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

                        echo "Helm chart validated."
                    '''
                }
            }
        }

        stage('Deploy To EKS') {
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
                        unset AWS_SESSION_TOKEN

                        echo "===== CONFIGURE EKS ACCESS ====="

                        mkdir -p "$(dirname "$KUBECONFIG")"

                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        kubectl get nodes

                        echo "===== HELM DEPLOYMENT ====="

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
STREAMINGAPP DEPLOYMENT SUCCESSFUL
========================================
AWS account      : ${AWS_ACCOUNT_ID}
EKS cluster      : ${EKS_CLUSTER}
Image tag        : ${IMAGE_TAG}
Application NS   : ${K8S_NAMESPACE}
Helm release     : ${HELM_RELEASE}
Helm namespace   : ${HELM_NAMESPACE}
========================================
"""
        }

        failure {
            echo 'Deployment failed. Check the first failed Jenkins stage.'
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
``
