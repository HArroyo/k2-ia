# SecVisor v6 (Vision-Language Model)
**Desarrollado por:** Partners AI Technologies  
**Propietario:** Partners  
**Licenciatario:** K2 Seguridad y Resguardo (Licencia Comercial de Uso)  
**Versión:** 6.0.0  

---

Este directorio aloja los pesos binarios de inferencia de **SecVisor v6**, motor propietario de Partners integrado bajo licencia en la plataforma K2 Seguridad y Resguardo.

- Los pesos (`model.safetensors`, configuraciones de tokenizador y proyección) se aprovisionan al primer arranque del servicio en la instancia de GPU.
- Requiere ~900MB de VRAM en precisión FP16 (CUDA habilitado).
