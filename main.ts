import { Construct } from 'constructs';
import { App, Chart, ChartProps } from 'cdk8s';
import { KubeDeployment, KubeService, IntOrString, KubeSecret, KubeConfigMap } from './imports/k8s';
import { config } from 'dotenv';
import { ImagePullPolicy, ServiceType } from 'cdk8s-plus-17';

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
        type: ServiceType.LOAD_BALANCER,
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
              name: process.env.DOCKER_CONTAINER_NAME || '',
              image: process.env.DOCKER_REGISTRY,
              ports: [{
                containerPort: port,
              }],
              imagePullPolicy: ImagePullPolicy.IF_NOT_PRESENT,
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

config();
const app = new App();
new TemplateInfra(app, 'template-infra');
app.synth();
