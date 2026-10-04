pipeline {

    agent any

    environment {
        AWS_REGION = 'us-east-1'
        ACCOUNT_ID = '909884060498'
        EKS_CLUSTER = 'streaming-eks'

        AUTH_REPO      = 'streaming-auth'
        ADMIN_REPO     = 'streaming-admin'
        CHAT_REPO      = 'streaming-chat'
        STREAM_REPO    = 'streaming-stream'
        FRONTEND_REPO  = 'streaming-frontend'
        IMAGE_TAG      = '1.0.0'
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

        stage('AWS Authentication') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                    aws sts get-caller-identity
                    '''
                }
            }
        }

        stage('ECR Login') {
            steps {
                sh '''
                aws ecr get-login-password --region ${AWS_REGION} | \
                docker login \
                --username AWS \
                --password-stdin \
                ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                docker build -t streaming-auth:1.0.0 backend/authService
                docker build -t streaming-admin:1.0.0 backend/adminService
                docker build -t streaming-chat:1.0.0 backend/chatService
                docker build -t streaming-stream:1.0.0 backend/streamingService
                docker build -t streaming-frontend:1.0.0 frontend
                '''
            }
        }

        stage('Tag Images') {
            steps {
                sh '''
                docker tag streaming-auth:1.0.0 ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-auth:1.0.0

                docker tag streaming-admin:1.0.0 ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-admin:1.0.0

                docker tag streaming-chat:1.0.0 ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-chat:1.0.0

                docker tag streaming-stream:1.0.0 ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-stream:1.0.0

                docker tag streaming-frontend:1.0.0 ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-frontend:1.0.0
                '''
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-auth:1.0.0

                docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-admin:1.0.0

                docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-chat:1.0.0

                docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-stream:1.0.0

                docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/streaming-frontend:1.0.0
                '''
            }
        }

        stage('Connect To EKS') {
            steps {
                sh '''
                aws eks update-kubeconfig \
                    --region ${AWS_REGION} \
                    --name ${EKS_CLUSTER}

                kubectl get nodes
                '''
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
