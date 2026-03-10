const path = require('path');

// En Jimp 0.x.x -> default export
// En Jimp ^1.0.0 -> destructuring
async function processIcon() {
    try {
        const iconPath = path.resolve(__dirname, '../assets/icon.png');
        console.log('Cargando imagen de:', iconPath);

        // Carga robusta compatible con varias versiones de Jimp
        let Jimp;
        try {
            Jimp = require('jimp');
            if (typeof Jimp !== 'function' && typeof Jimp.read !== 'function') {
                Jimp = require('jimp').Jimp;
            }
        } catch (e) {
            console.error('No se pudo requerir Jimp', e);
            return;
        }

        // Leer la imagen procesada
        const image = await Jimp.read(iconPath);

        const w = image.bitmap.width;
        const h = image.bitmap.height;

        // El radio del círculo central
        // Basado en la imagen, el logo circular ocupa el centro
        const cx = w / 2;
        const cy = h / 2;

        // Ajustar agresivamente el margen de tolerancia del "ajedrezado" invisible
        let leftX = 0;
        while (leftX < cx) {
            let color = image.getPixelColor(leftX, cy);
            // Si el color no es 0x00000000 (totalmente transparente) paramos
            if (color > 0) break;
            leftX++;
        }

        // Si la matemática de los bordes falla, asumimos un pin redondo ocupador de casi todo
        const radius = w * 0.46; // Del 46% al centro equivale a casi el 95% del canvas total cubierto

        console.log('Dimensiones: ' + w + 'x' + h + ', Centro: ' + cx + ',' + cy + ', Radio: ' + radius);

        // Procesar pixel por pixel
        image.scan(0, 0, w, h, function (x, y, idx) {
            // Distancia euclidiana desde el centro
            const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));

            // La imagen generada tiene su ajedrezado feo por fuera del círculo perfecto.
            if (distance > radius) {
                // Fuera del círculo principal: volver el pixel 100% transparente (Alpha channel = 0)
                this.bitmap.data[idx + 3] = 0;
            } else if (distance > radius - 2) {
                // Anti-aliasing super simple para el borde serruchado
                const alphaRatio = Math.max(0, 1 - (distance - (radius - 2)) / 2);
                this.bitmap.data[idx + 3] = Math.floor(this.bitmap.data[idx + 3] * alphaRatio);
            }
        });

        console.log('Aplicando recorte (crop) del lienzo para maximizar el tamaño en Windows...');
        // Identificar las coordenadas de la caja que enmarca al círculo exacto
        const cropX = Math.round(cx - radius);
        const cropY = Math.round(cy - radius);
        const cropSize = Math.round(radius * 2);

        image.crop({ x: cropX, y: cropY, w: cropSize, h: cropSize });

        console.log('Recorte circular y crop de canvas terminado. Guardando encima...');

        // Sobreescribir el archivo original 
        await new Promise((resolve, reject) => {
            image.write(iconPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('¡Icono guardado sin bordes ni ajedrezados exitosamente!');

    } catch (error) {
        console.error('Error procesando imagen:', error);
    }
}

processIcon();
