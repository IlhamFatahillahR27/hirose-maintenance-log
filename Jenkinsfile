pipeline {
    agent any

    environment {
        CI = 'true'
    }

    stages {
        stage('Checkout SCM') {
            steps {
                echo 'Checking out source code repository...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing Backend and Frontend dependencies...'
                dir('backend') {
                    sh 'npm ci || npm install'
                }
                dir('frontend') {
                    sh 'npm ci || npm install'
                }
            }
        }

        stage('Lint & Typecheck') {
            steps {
                echo 'Running static analysis and TypeScript type checks...'
                dir('backend') {
                    sh 'npx tsc --noEmit'
                }
                dir('frontend') {
                    sh 'npm run type-check'
                    sh 'npm run lint'
                }
            }
        }

        stage('Automated Testing') {
            steps {
                echo 'Executing automated RBAC integration tests...'
                dir('backend') {
                    sh 'npm run test'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building production Docker images with Docker Compose...'
                sh 'docker compose build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
        }
        success {
            echo 'CI Pipeline passed successfully! All test suites, typechecks, and Docker builds verified.'
        }
        failure {
            echo 'CI Pipeline failed! Please review stage logs for errors.'
        }
    }
}
