import { Construct } from 'constructs';
import { App, Chart, ChartProps } from 'cdk8s';
import { KubeDeployment, KubeService, IntOrString, KubeSecret, KubeConfigMap } from './imports/k8s';
import { config } from 'dotenv';

config();

export class TemplateInfra extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = { }) {
    super(scope, id, props);

    const label = { app: 'template-infra' };

    const port = 8080;

    const dockerSecret = new KubeSecret(this, 'github-secret', {
      type: 'kubernetes.io/dockerconfigjson',
      data: {
        '.dockerconfigjson': process.env.DOCKER_CONFIG || ''
      }
    });

    const configMap = new KubeConfigMap(this, 'config-map', {
      data: {
        PORT: port.toString()
      }
    });

    new KubeService(this, 'service', {
      spec: {
        type: 'LoadBalancer',
        ports: [{
          port: 80,
          targetPort: IntOrString.fromNumber(port)
        }],
        selector: label
      }
    });

    new KubeDeployment(this, 'deployment', {
      spec: {
        replicas: 2,
        selector: {
          matchLabels: label
        },
        template: {
          metadata: {
            labels: label
          },
          spec: {
            containers: [{
              name: 'template-api',
              image: 'docker.pkg.github.com/lusatiro/template-api/template-api:latest',
              ports: [{
                containerPort: port,
              }],
              imagePullPolicy: 'Always',
              envFrom: [{
                configMapRef: {
                  name: configMap.name
                },
              }]
            }],
            imagePullSecrets: [{
              name: dockerSecret.name,
            }]
          },
        },
      },
    });
  }
}

const app = new App();
new TemplateInfra(app, 'template-infra');
app.synth();
