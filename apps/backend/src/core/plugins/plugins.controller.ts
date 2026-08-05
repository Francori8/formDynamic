import { Controller, Get } from '@nestjs/common';
import { PluginRegistryService } from '../plugin-registry/plugin-registry.service';

@Controller('plugins')
export class PluginsController {
  constructor(private readonly registry: PluginRegistryService) {}

  @Get('field-types')
  getFieldTypes() {
    return this.registry.listByType('field-type').map((name) => {
      const plugin = this.registry.getFieldType(name);
      return { name: plugin.name, label: plugin.label };
    });
  }

  @Get('available')
  getAvailable() {
    const expose = ['field-visibility', 'section-flow', 'form-display', 'access-control', 'response-hook'] as const;
    return expose.flatMap((type) =>
      this.registry.listByType(type).map((name) => ({
        name,
        type,
        label: PLUGIN_LABELS[name] ?? name,
        description: PLUGIN_DESCRIPTIONS[name] ?? '',
      })),
    );
  }
}

const PLUGIN_LABELS: Record<string, string> = {
  'default-visibility': 'Visibilidad condicional',
  'default-section-flow': 'Flujo entre secciones',
  'all-sections': 'Mostrar todas las secciones juntas',
  'public-link': 'Enlace público',
  'individual-link': 'Enlace individual (con OTP)',
  'otp-auth': 'Verificación OTP',
  webhook: 'Webhook',
  'owner-notify': 'Aviso por email al dueño',
  'respondent-confirmation': 'Confirmación por email al respondente',
};

const PLUGIN_DESCRIPTIONS: Record<string, string> = {
  'default-visibility': 'Muestra u oculta campos según las respuestas del usuario.',
  'default-section-flow': 'Salta a distintas secciones según las respuestas del usuario.',
  'all-sections': 'Muestra todas las secciones en una sola página en lugar de paso a paso.',
  'public-link': 'Cualquiera con el link puede responder el formulario.',
  'individual-link': 'Solo las personas invitadas por email pueden responder.',
  'otp-auth': 'Cualquiera que entre al formulario debe verificar su email con un código OTP antes de responder — sin lista de invitados. Si además usás un enlace individual, ese link también exige OTP a los emails invitados.',
  webhook: 'Envia un POST con los datos de cada respuesta a una URL externa.',
  'owner-notify': 'Te avisa por email cada vez que llega una respuesta nueva.',
  'respondent-confirmation': 'Le confirma por email al respondente que su respuesta fue recibida (requiere identidad verificada por email, ej. otp-auth).',
};
