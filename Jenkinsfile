pipeline {
    agent any

    environment {
        AWS_REGION = "us-east-1"
        AWS_ACCOUNT_ID = "909884060498"

        FRONTEND_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-frontend"
        AUTH_REPO     = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-auth"
        ADMIN_REPO    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-admin"
        CHAT_REPO     = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-chat"
        STREAM_REPO   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-service"

        IMAGE_TAG = "${BUILD_NUMBER}"

        CLUSTER_NAME = "streaming-eks"
        NAMESPACE = "streaming"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                url: '<YOUR_GITHUB_REPO_URL>'
            }
        }

        stage('AWS Login') {
            steps {
                withCredentials([
                    [$class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-secret-priya']
                ]) {

                    sh '''
                    aws ecr get-login-password \
                    --region $AWS_REGION \
                    | docker login \
                    --username AWS \
                    --password-stdin \
                    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                    '''
                }
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                docker build -t streaming-frontend:${IMAGE_TAG} ./frontend
                docker build -t streaming-auth:${IMAGE_TAG} ./backend/authService
                docker build -t streaming-admin:${IMAGE_TAG} ./backend/adminService
                docker build -t streaming-chat:${IMAGE_TAG} ./backend/chatService
                docker build -t streaming-service:${IMAGE_TAG} ./backend/streamingService
                '''
            }
        }

        stage('Tag Images') {
            steps {
                sh '''
                docker tag streaming-frontend:${IMAGE_TAG} ${FRONTEND_REPO}:${IMAGE_TAG}
                docker tag streaming-auth:${IMAGE_TAG} ${AUTH_REPO}:${IMAGE_TAG}
                docker tag streaming-admin:${IMAGE_TAG} ${ADMIN_REPO}:${IMAGE_TAG}
                docker tag streaming-chat:${IMAGE_TAG} ${CHAT_REPO}:${IMAGE_TAG}
                docker tag streaming-service:${IMAGE_TAG} ${STREAM_REPO}:${IMAGE_TAG}
                '''
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                docker push ${FRONTEND_REPO}:${IMAGE_TAG}
                docker push ${AUTH_REPO}:${IMAGE_TAG}
                docker push ${ADMIN_REPO}:${IMAGE_TAG}
                docker push ${CHAT_REPO}:${IMAGE_TAG}
                docker push ${STREAM_REPO}:${IMAGE_TAG}
                '''
            }
        }

        stage('Configure EKS') {
            steps {
                withCredentials([
                    [$class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-secret-priya']
                ]) {

                    sh '''
                    aws eks update-kubeconfig \
                    --region $AWS_REGION \
                    --name $CLUSTER_NAME
                    '''
                }
            }
        }

        stage('Helm Deploy') {
            steps {
                sh '''
                helm upgrade --install streaming-app ./helm/streaming-app \
                --namespace ${NAMESPACE} \
                --create-namespace \
                --set frontend.tag=${IMAGE_TAG} \
                --set auth.tag=${IMAGE_TAG} \
                --set admin.tag=${IMAGE_TAG} \
                --set chat.tag=${IMAGE_TAG} \
                --set streaming.tag=${IMAGE_TAG}
                '''
            }
        }

        stage('Validation') {
            steps {
                sh '''
                kubectl get pods -n ${NAMESPACE}
                kubectl get svc -n ${NAMESPACE}

                kubectl rollout status deployment/auth -n ${NAMESPACE}
                kubectl rollout status deployment/admin -n ${NAMESPACE}
                kubectl rollout status deployment/chat -n ${NAMESPACE}
                kubectl rollout status deployment/frontend -n ${NAMESPACE}
                kubectl rollout status deployment/streaming -n ${NAMESPACE}
                '''
            }
        }
    }

    post {

        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Deployment Failed'
        }

        always {
            sh 'docker system prune -af || true'
        }
    }
}
