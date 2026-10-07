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
        HELM_NAMESPACE = 'streaming'
        HELM_RELEASE = 'streaming-app'
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBECONFIG = "${WORKSPACE}/.kube/config"
        CHART_DIR = 'helm/streaming-app'
    }

    stages {
        stage('Checkout Main') {
            steps {
                deleteDir()
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[url: 'https://github.com/rishi291221/StreamingApp.git']]
                ])
                sh '''
                    set -eu
                    git log -1 --oneline
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
                        unset AWS_SESSION_TOKEN || true
                        CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
                        if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
                            echo "ERROR: AWS account is $CURRENT_ACCOUNT; expected $AWS_ACCOUNT_ID"
                            exit 1
                        fi
                        aws ecr get-login-password --region "$AWS_REGION" | \
                            docker login --username AWS --password-stdin "$ECR_REGISTRY"
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
                        unset AWS_SESSION_TOKEN || true
                        for REPOSITORY in streaming-auth streaming-admin streaming-chat streaming-stream streaming-frontend
                        do
                            aws ecr describe-repositories \
                                --repository-names "$REPOSITORY" \
                                --region "$AWS_REGION" >/dev/null
                        done
                        echo "All ECR repositories verified."
                    '''
                }
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -eu
                    docker build -t streaming-auth:"$IMAGE_TAG" backend/authService
                    docker build -t streaming-admin:"$IMAGE_TAG" backend/adminService
                    docker build -t streaming-chat:"$IMAGE_TAG" backend/chatService
                    docker build -t streaming-stream:"$IMAGE_TAG" backend/streamingService
                    docker build -t streaming-frontend:"$IMAGE_TAG" frontend
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
                        unset AWS_SESSION_TOKEN || true
                        aws ecr get-login-password --region "$AWS_REGION" | \
                            docker login --username AWS --password-stdin "$ECR_REGISTRY"

                        docker tag streaming-auth:"$IMAGE_TAG" "$ECR_REGISTRY/streaming-auth:$IMAGE_TAG"
                        docker tag streaming-admin:"$IMAGE_TAG" "$ECR_REGISTRY/streaming-admin:$IMAGE_TAG"
                        docker tag streaming-chat:"$IMAGE_TAG" "$ECR_REGISTRY/streaming-chat:$IMAGE_TAG"
                        docker tag streaming-stream:"$IMAGE_TAG" "$ECR_REGISTRY/streaming-stream:$IMAGE_TAG"
                        docker tag streaming-frontend:"$IMAGE_TAG" "$ECR_REGISTRY/streaming-frontend:$IMAGE_TAG"

                        docker push "$ECR_REGISTRY/streaming-auth:$IMAGE_TAG"
                        docker push "$ECR_REGISTRY/streaming-admin:$IMAGE_TAG"
                        docker push "$ECR_REGISTRY/streaming-chat:$IMAGE_TAG"
                        docker push "$ECR_REGISTRY/streaming-stream:$IMAGE_TAG"
                        docker push "$ECR_REGISTRY/streaming-frontend:$IMAGE_TAG"
                    '''
                }
            }
        }

        stage('Validate Helm Chart') {
            steps {
                sh '''
                    set -eu
                    helm lint "$CHART_DIR" \
                        --set-string namespace="$K8S_NAMESPACE" \
                        --set-string auth.tag="$IMAGE_TAG" \
                        --set-string admin.tag="$IMAGE_TAG" \
                        --set-string chat.tag="$IMAGE_TAG" \
                        --set-string streaming.tag="$IMAGE_TAG" \
                        --set-string frontend.tag="$IMAGE_TAG"

                    helm template "$HELM_RELEASE" "$CHART_DIR" \
                        --namespace "$HELM_NAMESPACE" \
                        --set-string namespace="$K8S_NAMESPACE" \
                        --set-string auth.tag="$IMAGE_TAG" \
                        --set-string admin.tag="$IMAGE_TAG" \
                        --set-string chat.tag="$IMAGE_TAG" \
                        --set-string streaming.tag="$IMAGE_TAG" \
                        --set-string frontend.tag="$IMAGE_TAG" \
                        > rendered-streaming-app.yaml
                    test -s rendered-streaming-app.yaml
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
                    ),
                    string(
                        credentialsId: 'mongo-secretss',
                        variable: 'MONGO_URI'
                    )
                ]) {
                    sh '''
                        set -eu
                        unset AWS_SESSION_TOKEN || true

                        mkdir -p "$(dirname "$KUBECONFIG")"
                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        kubectl get nodes

                        kubectl create namespace "$K8S_NAMESPACE" \
                            --dry-run=client -o yaml | kubectl apply -f -

                        kubectl label namespace "$K8S_NAMESPACE" \
                            app.kubernetes.io/managed-by=Helm \
                            --overwrite
                        kubectl annotate namespace "$K8S_NAMESPACE" \
                            meta.helm.sh/release-name="$HELM_RELEASE" \
                            meta.helm.sh/release-namespace="$HELM_NAMESPACE" \
                            --overwrite

                        kubectl create secret generic mongodb-secret \
                            --from-literal=MONGO_URI="$MONGO_URI" \
                            --namespace "$K8S_NAMESPACE" \
                            --dry-run=client -o yaml | kubectl apply -f -

                        for RESOURCE in \
                            deployment/auth \
                            deployment/admin \
                            deployment/chat \
                            deployment/streaming \
                            deployment/frontend \
                            service/auth-service \
                            service/admin-service \
                            service/chat-service \
                            service/streaming-service \
                            service/frontend-service
                        do
                            if kubectl get "$RESOURCE" --namespace "$K8S_NAMESPACE" >/dev/null 2>&1; then
                                kubectl label "$RESOURCE" \
                                    --namespace "$K8S_NAMESPACE" \
                                    app.kubernetes.io/managed-by=Helm \
                                    --overwrite
                                kubectl annotate "$RESOURCE" \
                                    --namespace "$K8S_NAMESPACE" \
                                    meta.helm.sh/release-name="$HELM_RELEASE" \
                                    meta.helm.sh/release-namespace="$HELM_NAMESPACE" \
                                    --overwrite
                            fi
                        done

                        helm upgrade --install "$HELM_RELEASE" "$CHART_DIR" \
                            --namespace "$HELM_NAMESPACE" \
                            --create-namespace \
                            --set-string namespace="$K8S_NAMESPACE" \
                            --set-string auth.tag="$IMAGE_TAG" \
                            --set-string admin.tag="$IMAGE_TAG" \
                            --set-string chat.tag="$IMAGE_TAG" \
                            --set-string streaming.tag="$IMAGE_TAG" \
                            --set-string frontend.tag="$IMAGE_TAG" \
                            --atomic \
                            --wait \
                            --timeout 10m

                        helm status "$HELM_RELEASE" --namespace "$HELM_NAMESPACE"
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
                        unset AWS_SESSION_TOKEN || true
                        aws eks update-kubeconfig \
                            --region "$AWS_REGION" \
                            --name "$EKS_CLUSTER" \
                            --kubeconfig "$KUBECONFIG"

                        for DEPLOYMENT in auth admin chat streaming frontend
                        do
                            kubectl rollout status deployment/"$DEPLOYMENT" \
                                --namespace "$K8S_NAMESPACE" \
                                --timeout=5m
                        done

                        kubectl get pods --namespace "$K8S_NAMESPACE" -o wide
                        kubectl get services --namespace "$K8S_NAMESPACE"
                        helm list --namespace "$HELM_NAMESPACE"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'STREAMINGAPP DEPLOYMENT SUCCESSFUL'
            withCredentials([
                string(
                    credentialsId: 'teams-webhook-priya',
                    variable: 'SLACK_WEBHOOK'
                )
            ]) {
                script {
                    def slackStatus = sh(
                        returnStatus: true,
                        script: '''
                            set +x
                            PAYLOAD=$(printf '{"text":"StreamingApp deployment SUCCESSFUL\\nJob: %s\\nBuild: #%s\\nEKS cluster: %s\\nNamespace: %s\\nBuild URL: %s"}' \
                                "$JOB_NAME" "$BUILD_NUMBER" "$EKS_CLUSTER" "$K8S_NAMESPACE" "$BUILD_URL")
                            curl --fail-with-body \
                                --request POST \
                                --header 'Content-Type: application/json' \
                                --data "$PAYLOAD" \
                                "$SLACK_WEBHOOK"
                        '''
                    )
                    if (slackStatus != 0) {
                        echo "WARNING: Slack success notification failed with exit code ${slackStatus}."
                    }
                }
            }
        }
        failure {
            echo 'Deployment failed. Check the first failed Jenkins stage.'
            withCredentials([
                string(
                    credentialsId: 'teams-webhook-priya',
                    variable: 'SLACK_WEBHOOK'
                )
            ]) {
                script {
                    def slackStatus = sh(
                        returnStatus: true,
                        script: '''
                            set +x
                            PAYLOAD=$(printf '{"text":"StreamingApp deployment FAILED\\nJob: %s\\nBuild: #%s\\nCheck Jenkins Console Output: %s"}' \
                                "$JOB_NAME" "$BUILD_NUMBER" "$BUILD_URL")
                            curl --fail-with-body \
                                --request POST \
                                --header 'Content-Type: application/json' \
                                --data "$PAYLOAD" \
                                "$SLACK_WEBHOOK"
                        '''
                    )
                    if (slackStatus != 0) {
                        echo "WARNING: Slack failure notification failed with exit code ${slackStatus}."
                    }
                }
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
