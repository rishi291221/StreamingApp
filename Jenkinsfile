pipeline {

    agent any

    environment {
        AWS_REGION = 'us-east-1'
        ACCOUNT_ID = '909884060498'
        EKS_CLUSTER = 'streaming-eks'

        AUTH_REPO = 'streaming-auth'
        ADMIN_REPO = 'streaming-admin'
        CHAT_REPO = 'streaming-chat'
        STREAM_REPO = 'streaming-stream'
        FRONTEND_REPO = 'streaming-frontend'

        IMAGE_TAG = '1.0.0'

        ECR_REGISTRY = '909884060498.dkr.ecr.us-east-1.amazonaws.com'
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
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
                    echo "=== AWS Identity Check ==="

                    aws sts get-caller-identity
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
                    echo "=== ECR Login ==="

                    aws ecr get-login-password \
                    --region ${AWS_REGION} | \
                    docker login \
                    --username AWS \
                    --password-stdin \
                    ${ECR_REGISTRY}
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                docker build -t streaming-auth:${IMAGE_TAG} backend/authService

                docker build -t streaming-admin:${IMAGE_TAG} backend/adminService

                docker build -t streaming-chat:${IMAGE_TAG} backend/chatService

                docker build -t streaming-stream:${IMAGE_TAG} backend/streamingService

                docker build -t streaming-frontend:${IMAGE_TAG} frontend
                '''
            }
        }

        stage('Tag Images') {
            steps {
                sh '''
                docker tag streaming-auth:${IMAGE_TAG} ${ECR_REGISTRY}/streaming-auth:${IMAGE_TAG}

                docker tag streaming-admin:${IMAGE_TAG} ${ECR_REGISTRY}/streaming-admin:${IMAGE_TAG}

                docker tag streaming-chat:${IMAGE_TAG} ${ECR_REGISTRY}/streaming-chat:${IMAGE_TAG}

                docker tag streaming-stream:${IMAGE_TAG} ${ECR_REGISTRY}/streaming-stream:${IMAGE_TAG}

                docker tag streaming-frontend:${IMAGE_TAG} ${ECR_REGISTRY}/streaming-frontend:${IMAGE_TAG}
                '''
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                    docker push ${ECR_REGISTRY}/streaming-auth:${IMAGE_TAG}

                    docker push ${ECR_REGISTRY}/streaming-admin:${IMAGE_TAG}

                    docker push ${ECR_REGISTRY}/streaming-chat:${IMAGE_TAG}

                    docker push ${ECR_REGISTRY}/streaming-stream:${IMAGE_TAG}

                    docker push ${ECR_REGISTRY}/streaming-frontend:${IMAGE_TAG}
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
                    aws eks update-kubeconfig \
                    --region ${AWS_REGION} \
                    --name ${EKS_CLUSTER}

                    kubectl get nodes
                    '''
                }
            }
        }

        stage('Deploy Helm') {
            steps {
                sh '''
                cd helm/streaming-app

                helm upgrade \
                --install \
                streaming-app \
                .
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                kubectl get pods -n streaming

                kubectl get svc -n streaming

                helm list -A
                '''
            }
        }
    }

    post {

        success {
            echo 'Streaming application deployed successfully'
        }

        failure {
            echo 'Deployment failed - check Jenkins console output'
        }
    }
}
