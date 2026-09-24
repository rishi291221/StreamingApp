pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = '206226812351'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t streamingapp-frontend:1.0 ./frontend
                    docker build -t streamingapp-auth:1.0 ./backend/authService
                    docker build -t streamingapp-streaming:1.0 ./backend/streamingService
                    docker build -t streamingapp-admin:1.0 ./backend/adminService
                    docker build -t streamingapp-chat:1.0 ./backend/chatService
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        export AWS_DEFAULT_REGION=$AWS_REGION

                        aws ecr get-login-password --region $AWS_REGION | \
                        docker login \
                        --username AWS \
                        --password-stdin $ECR_REGISTRY
                    '''
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                    docker tag streamingapp-frontend:1.0 \
                        $ECR_REGISTRY/streamingapp-frontend:1.0

                    docker tag streamingapp-auth:1.0 \
                        $ECR_REGISTRY/streamingapp-auth:1.0

                    docker tag streamingapp-streaming:1.0 \
                        $ECR_REGISTRY/streamingapp-streaming:1.0

                    docker tag streamingapp-admin:1.0 \
                        $ECR_REGISTRY/streamingapp-admin:1.0

                    docker tag streamingapp-chat:1.0 \
                        $ECR_REGISTRY/streamingapp-chat:1.0

                    docker push $ECR_REGISTRY/streamingapp-frontend:1.0
                    docker push $ECR_REGISTRY/streamingapp-auth:1.0
                    docker push $ECR_REGISTRY/streamingapp-streaming:1.0
                    docker push $ECR_REGISTRY/streamingapp-admin:1.0
                    docker push $ECR_REGISTRY/streamingapp-chat:1.0
                '''
            }
        }
    }
}