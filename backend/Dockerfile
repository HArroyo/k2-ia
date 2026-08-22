FROM php:8.2-fpm-alpine

# Instalar extensiones del sistema y PHP
RUN apk add --no-cache \
    postgresql-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    nginx \
    supervisor

RUN docker-php-ext-install pdo pdo_pgsql pgsql gd zip

# Instalar Composer
COPY --from=composer:2.6 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

# Permisos de almacenamiento
RUN mkdir -p /var/www/storage/framework/cache \
    /var/www/storage/framework/sessions \
    /var/www/storage/framework/views \
    /var/www/storage/app/public/snapshots \
    /var/www/storage/app/public/forensic_videos \
    /var/www/bootstrap/cache && \
    chmod -R 777 /var/www/storage /var/www/bootstrap/cache

# Configuración Nginx y Supervisor
EXPOSE 8000

CMD php -S 0.0.0.0:8000 -t public
