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

    
