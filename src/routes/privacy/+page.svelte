<!-- src/routes/privacy/+page.svelte -->

<svelte:head>
    <title>Aviso de Privacidad — Ex Libris</title>
</svelte:head>

<div class="container">

    <h1>Aviso de Privacidad</h1>
    
    <p class="last-updated">Última actualización: [FECHA]</p>

    <section>
        <h2>1. Identidad y Domicilio del Responsable</h2>
        <p><strong>patrouch.ca</strong></p>
        <p><strong>Domicilio:</strong>Ciudad de México</p>
        <p><strong>Correo electrónico:</strong>cheftech@patrouch.ca </p>
    </section>

    <section>
        <h2>2. Datos Personales que Recabamos</h2>
        <p>Ex Libris recaba los siguientes datos personales:</p>
        <ul>
            <li>Nombre de usuario</li>
            <li>Dirección de correo electrónico</li>
            <li>Contraseña (almacenada de forma encriptada)</li>
            <li>Reseñas y comentarios que publiques</li>
            <li>Información de navegación y cookies</li>
        </ul>
    </section>

    <section>
        <h2>3. Finalidades del Tratamiento</h2>
        <p>Tus datos personales serán utilizados para:</p>
        <ul>
            <li>Crear y administrar tu cuenta de usuario</li>
            <li>Publicar tus reseñas y comentarios de libros</li>
            <li>Enviarte notificaciones sobre tu cuenta (si autorizas)</li>
            <li>Mejorar nuestros servicios</li>
            <li>Cumplir con obligaciones legales</li>
        </ul>
    </section>

    <section>
        <h2>4. Transferencias de Datos</h2>
        <p>Tus datos pueden ser transferidos y procesados por:</p>
        <ul>
            <li><strong>Cloudflare, Inc.</strong> (Estados Unidos) - Hospedaje y seguridad</li>
            <li><strong>Mailgun</strong> (Estados Unidos) - Envío de correos electrónicos</li>
        </ul>
        <p>Estas transferencias son necesarias para la prestación del servicio.</p>
    </section>

    <section>
        <h2>5. Derechos ARCO</h2>
        <p>Como titular de datos personales, tienes derecho a:</p>
        <ul>
            <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre ti</li>
            <li><strong>Rectificación:</strong> Corregir datos incorrectos</li>
            <li><strong>Cancelación:</strong> Solicitar la eliminación de tus datos</li>
            <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos</li>
        </ul>
        <p>Para ejercer tus derechos ARCO, envía un correo a: <strong>[EMAIL PARA ARCO]</strong></p>
    </section>

    <section>
        <h2>6. Revocación del Consentimiento</h2>
        <p>Puedes revocar tu consentimiento para el tratamiento de tus datos en cualquier momento contactándonos a: <strong>[EMAIL DE CONTACTO]</strong></p>
    </section>

    <section>
        <h2>7. Cookies y Tecnologías de Rastreo</h2>
        <p>Utilizamos cookies para mantener tu sesión activa y mejorar la experiencia de usuario. Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.</p>
    </section>

    <section>
        <h2>8. Medidas de Seguridad</h2>
        <p>Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger tus datos personales, incluyendo encriptación de contraseñas y conexiones seguras HTTPS.</p>
    </section>

    <section>
        <h2>9. Cambios al Aviso de Privacidad</h2>
        <p>Nos reservamos el derecho de modificar este Aviso de Privacidad. Los cambios se publicarán en esta página y la fecha de actualización se modificará.</p>
    </section>

    <section>
        <h2>10. Contacto</h2>
        <p>Para cualquier duda sobre este Aviso de Privacidad, contáctanos en: <strong>[EMAIL DE CONTACTO]</strong></p>
    </section>

    <div class="back-link">
        <a href="/" class="btn-secondary">Volver al Inicio</a>
    </div>
</div>

<style>
    .container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
    }
    
    .legal-notice {
        background: #fef3c7;
        border: 2px solid #f59e0b;
        padding: 1rem;
        margin-bottom: 2rem;
        border-radius: 8px;
        font-weight: bold;
        text-align: center;
        color: #92400e;
    }
    
    h1 {
        margin-bottom: 1rem;
    }
    
    .last-updated {
        color: #6b7280;
        font-style: italic;
        margin-bottom: 2rem;
    }
    
    section {
        margin-bottom: 2rem;
    }
    
    h2 {
        color: #1f2937;
        margin-bottom: 1rem;
        margin-top: 2rem;
    }
    
    ul {
        margin-left: 1.5rem;
        line-height: 1.8;
    }
    
    .back-link {
        margin-top: 3rem;
    }
</style>
