pipeline {
  agent { docker { image 'node:20' } }
  options { timestamps() }
  stages {
    stage('Checkout'){ steps{ checkout scm } }
    stage('Install'){ steps{ sh 'npm ci' } }
    stage('Build'){ steps{ sh 'npm run build -- --configuration=production' } }
    stage('Archive'){ steps{ archiveArtifacts artifacts: 'dist/**', fingerprint: true } }
  }
}