pipeline {
<<<<<<< HEAD

=======
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
    agent any

    environment {
        AWS_REGION = 'us-east-1'
<<<<<<< HEAD
        ACCOUNT_ID = '909884060498'
        EKS_CLUSTER = 'streaming-eks'

        AUTH_REPO      = 'streaming-auth'
        ADMIN_REPO     = 'streaming-admin'
        CHAT_REPO      = 'streaming-chat'
        STREAM_REPO    = 'streaming-stream'
        FRONTEND_REPO  = 'streaming-frontend'
        IMAGE_TAG      = '1.0.0'
=======
        AWS_ACCOUNT_ID = '206226812351'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
    }

    stages {

<<<<<<< HEAD
        stage('Checkout Source') {
=======
        stage('Checkout') {
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
            steps {
                checkout scm
            }
        }

<<<<<<< HEAD
        stage('Verify Tools') {
            steps {
                sh '''
                docker --version
                aws --version
                kubectl version --client
                helm version
=======
        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t streamingapp-frontend:1.0 ./frontend
                    docker build -t streamingapp-auth:1.0 ./backend/authService
                    docker build -t streamingapp-streaming:1.0 ./backend/streamingService
                    docker build -t streamingapp-admin:1.0 ./backend/adminService
                    docker build -t streamingapp-chat:1.0 ./backend/chatService
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
                '''
            }
        }

<<<<<<< HEAD
        stage('AWS Authentication') {
=======
        stage('Login to ECR') {
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-secret-priya',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
<<<<<<< HEAD

                    sh '''
                    aws sts get-caller-identity
=======
                    sh '''
                        export AWS_DEFAULT_REGION=$AWS_REGION

                        aws ecr get-login-password --region $AWS_REGION | \
                        docker login \
                        --username AWS \
                        --password-stdin $ECR_REGISTRY
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
                    '''
                }
            }
        }

<<<<<<< HEAD
        stage('ECR Login') {
            steps {
                sh '''
                aws ecr get-login-password --region ${AWS_REGION} | \
                docker login \
                --username AWS \
                --password-stdin \
                ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
=======
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
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
                '''
            }
        }

<<<<<<< HEAD
        stage('Build Docker Images') {
            steps {
                sh '''
                docker build -t streaming-auth:1.0.0 backend/authService
                docker build -t streaming-admin:1.0.0 backend/adminService
                docker build -t streaming-chat:1.0.0 backend/chatService
                docker build -t streaming-stream:1.0.0 backend/streamingService
                docker build -t streaming-frontend:1.0.0 frontend
=======
        stage('Check Kubernetes Tools') {
            steps {
                sh '''
                    kubectl version --client
                    helm version
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
                '''
            }
        }

<<<<<<< HEAD
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
=======
        stage('Check EKS Access') {
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

                        aws eks update-kubeconfig \
                            --region $AWS_REGION \
                            --name streamingapp-eks

                        kubectl get nodes
                    '''
                }
            }
        }
    }
}
>>>>>>> eba504df9f3db14bdd9fc275c7c8ccd279dc922b
