# UAO Conecta

Plataforma académica de UAO Conecta construida con React, FastAPI y MongoDB.

## Funcionalidades principales

- Autenticación por correo y Google OAuth con validación de perfil académico incompleto.
- Perfil editable con foto, información académica, contacto y enlaces a plataformas.
- Creación y unión a asignaturas mediante código; cada asignatura conserva su creador y rol.
- Recursos de asignaturas, tareas y chat con archivos privados.
- Asistente de IA separado del almacenamiento de archivos.

## Almacenamiento y seguridad

Los archivos se guardan en el bucket privado `uao_files` de MongoDB GridFS usando `MONGO_URL` y `DB_NAME`. FastAPI guarda la metadata en `files` y comprueba autenticación, propietario o referencia autorizada antes de servir un archivo. El frontend abre y descarga archivos mediante solicitudes autenticadas y blobs; no expone URLs públicas de almacenamiento.

`EMERGENT_LLM_KEY` se utiliza únicamente por el endpoint `/api/ai` y no participa en la subida, lectura o descarga de archivos.

## Organización

- `backend/server.py`: API FastAPI, autenticación, permisos, MongoDB y GridFS.
- `frontend/src/pages`: pantallas de login, dashboard, perfiles y asignaturas.
- `frontend/src/components`: componentes reutilizables, incluido `CreateSubjectForm` y recursos.
- `frontend/src/services/fileService.js`: lectura, visualización y descarga autenticada de archivos.
- `frontend/src/hooks/useProtectedFile.js`: URLs blob temporales para imágenes protegidas.

## Variables de entorno

Copia los archivos `.env.example` correspondientes y configura valores privados fuera del repositorio. Nunca agregues claves, contraseñas o tokens al código fuente.

- Frontend: `REACT_APP_BACKEND_URL`
- Backend: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS` y `EMERGENT_LLM_KEY` solo para IA

## Desarrollo

```bash
# Backend (el supervisor del entorno mantiene el puerto configurado)
sudo supervisorctl restart backend

# Frontend
sudo supervisorctl restart frontend
```

Todas las rutas de API usan el prefijo `/api`.
