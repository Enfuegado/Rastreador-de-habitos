

/* clave para localStorage*/
const CLAVE_ALMACENAMIENTO = 'habits-vue-tracker';

// almacen reactivo compartido
const almacen = Vue.reactive({
  habitos: []
});

function cargarDesdeLocalStorage() {
  try {
    const raw = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    almacen.habitos = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error cargando localStorage', e);
    almacen.habitos = [];
  }
}

function guardarEnLocalStorage() {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(almacen.habitos));
  } catch (e) {
    console.error('Error guardando localStorage', e);
  }
}

// generador simple de ID
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

//COMPONENTES

// EncabezadoResumen - muestra totales y último hábito
const EncabezadoResumen = {
  name: 'EncabezadoResumen',
  template: `
    <div class="tarjeta">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <h2>{{ totalHabitos }} hábito<span v-if="totalHabitos!==1">s</span></h2>
          <p class="pequeno">Trata de mantener una racha diaria.</p>
        </div>
        <div style="text-align:right">
          <p class="pequeno">Último hábito añadido:</p>
          <div v-if="ultimo">{{ ultimo.title }}</div>
          <div v-else class="pequeno">—</div>
        </div>
      </div>
    </div>
  `,
  computed: {
    totalHabitos() { return almacen.habitos.length; },
    ultimo() { return almacen.habitos.length ? almacen.habitos[0] : null; }
  }
};

// FormularioAgregarHabito - formulario para añadir un hábito
const FormularioAgregarHabito = {
  name: 'FormularioAgregarHabito',
  template: `
    <div class="tarjeta">
      <h3 class="form-title">Agregar hábito</h3>
      <form class="fila-formulario" @submit.prevent="alEnviar">
        <input v-model="titulo" type="text" placeholder="Nombre del hábito (ej: oprimir minorías)" required />
        <input v-model="meta" type="text" placeholder="Meta (ej: diario, cada luna llena)" />
        <button class="boton" type="submit">Añadir</button>
      </form>
    </div>
  `,
  data() {
    return { titulo: '', meta: '' };
  },
  methods: {
    alEnviar() {
      const recortado = this.titulo.trim();
      if (!recortado) return;
      this.$emit('agregar-habito', { title: recortado, goal: this.meta.trim() });
      this.titulo = '';
      this.meta = '';
    }
  }
};

// ListaHabitos - lista de tarjetas de hábitos (confirmación inline, botones en su sitio)
const ListaHabitos = {
  name: 'ListaHabitos',
  props: { habitos: { type: Array, required: true } },
  data() {
    return {
      idConfirmacion: null // id del hábito que está esperando confirmación
    };
  },
  methods: {
    iniciarConfirmacion(id) {
      this.idConfirmacion = id;
    },
    cancelarConfirmacion() {
      this.idConfirmacion = null;
    },
    confirmarEliminar(id) {
      // emitir al padre para que ejecute la eliminación real
      this.$emit('confirmar-eliminar', id);
      this.idConfirmacion = null;
    }
  },
  template: `
    <div class="lista-habitos">
      <div v-for="habito in habitos" :key="habito.id" class="elemento-habito tarjeta">
        
        <!-- Bloque de información -->
        <div class="info-habito">
          <h4>{{ habito.title }}</h4>
          <div class="pequeno-mute">Meta: {{ habito.goal || '—' }}</div>
          <div class="pequeno-mute">Completado: {{ (habito.history && habito.history.length) || 0 }} veces</div>
        </div>

        <!-- Botones de acción / confirmación (alineados a la derecha) -->
        <div class="controles-habito">
          <template v-if="idConfirmacion !== habito.id">
            <button class="boton" @click="$router.push('/habit/' + habito.id)">Detalles</button>
            <button class="boton" @click.stop.prevent="iniciarConfirmacion(habito.id)">Eliminar</button>
          </template>

          <template v-else>
            <!-- Para la lista principal usamos confirmación en línea HORIZONTAL (como antes) -->
            <div class="confirmacion-lista">
              <span class="texto-confirmacion">¿Eliminar este hábito?</span>
              <div class="controles-confirmacion-lista">
                <button class="boton" @click.stop.prevent="confirmarEliminar(habito.id)">Confirmar</button>
                <button class="boton fantasma" @click.stop.prevent="cancelarConfirmacion">Cancelar</button>
              </div>
            </div>
          </template>
        </div>

      </div>
    </div>
  `
};

/*VISTAS / RUTAS*/

// RaizApp - vista principal (lista + formulario + header)
const RaizApp = {
  name: 'RaizApp',
  components: { EncabezadoResumen, FormularioAgregarHabito, ListaHabitos },
  template: `
    <div class="contenedor">
      <div class="encabezado">
        <div class="fila-encabezado">
          <h1>Trackehábitos</h1>
          <div class="pequeno">¡Establece tus hábitos en unos cuantos clicks!</div>
        </div>
        <EncabezadoResumen />
      </div>

      <div class="tarjeta">
        <div style="display:flex;gap:16px;flex-direction:column">
          <FormularioAgregarHabito @agregar-habito="agregarHabito" />
          <hr />
          <h3>Mis hábitos</h3>
          <p class="pequeno">Haz click en un hábito para ver más detalles.</p>

          <div v-if="habitos.length === 0" class="pequeno">Aún no tienes hábitos. Añade uno arriba.</div>

          <div v-else>
            <ListaHabitos :habitos="habitos" @confirmar-eliminar="eliminarHabito" />
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    habitos() { return almacen.habitos; }
  },
  methods: {
    agregarHabito(payload) {
      const id = generarId();
      const nuevoHabito = { id, title: payload.title, description: payload.description || '', goal: payload.goal || 'diario', history: [] };
      almacen.habitos.unshift(nuevoHabito);
      guardarEnLocalStorage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    eliminarHabito(id) {
      // Eliminación directa (la confirmación se gestiona en el componente hijo)
      almacen.habitos = almacen.habitos.filter(h => h.id !== id);
      guardarEnLocalStorage();
    }
  }
};

// DetalleHabito - vista con parámetros (/:id)
const DetalleHabito = {
  name: 'DetalleHabito',
  template: `
    <div class="contenedor">
      <div class="tarjeta">
        <a class="enlace-volver" @click.prevent="$router.push('/')">← Volver</a>
        <div class="grid-detalle" style="margin-top:12px">
          <div>
            <h2>{{ habito?.title || 'Hábito no encontrado' }}</h2>
            <p class="pequeno-mute">Meta: {{ habito?.goal || '—' }}</p>
            <p v-if="habito?.description">{{ habito.description }}</p>

            <div style="margin-top:12px" v-if="habito">
              <button class="boton" @click="marcarHoy">Marcar completado hoy</button>

              <!-- Mensaje de error / aviso que aparece debajo del botón -->
              <div v-if="mensajeError" class="error-msg" role="status" aria-live="polite">
                {{ mensajeError }}
              </div>
            </div>

            <div style="margin-top:12px" v-if="habito">
              <h4>Historial ({{ habito.history.length }})</h4>
              <div class="lista-historial">
                <div v-for="h in habito.historySorted" :key="h" class="elemento-historial">{{ h }}</div>
              </div>
            </div>
          </div>

          <div>
            <div class="tarjeta">
              <h4>Acciones rápidas</h4>
              <p class="pequeno-mute">Eliminar hábito</p>

              <!-- Vista de detalle: confirmación vertical, centrada -->
              <div v-if="!mostrarConfirmEliminar" style="margin-top:8px">
                <button class="boton" style="width:100%" @click="iniciarConfirmDetalle">Eliminar</button>
              </div>

              <div v-else class="confirmacion-en-linea" style="margin-top:8px">
                <span class="texto-confirmacion">¿Eliminar este hábito?</span>
                <div class="controles-confirmacion" style="margin-top:8px">
                  <button class="boton" @click="confirmarEliminarDetalle">Confirmar</button>
                  <button class="boton fantasma" @click="cancelarConfirmDetalle">Cancelar</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { habito: null, mensajeError: '', mostrarConfirmEliminar: false };
  },
  created() {
    this.cargarHabito();
  },
  watch: {
    '$route.params.id': 'cargarHabito'
  },
  methods: {
    cargarTodos() {
      try {
        const raw = localStorage.getItem(CLAVE_ALMACENAMIENTO);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    guardarTodos(arr) {
      try {
        localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(arr));
      } catch (e) {
        console.error(e);
      }
    },
    cargarHabito() {
      const arr = this.cargarTodos();
      const id = this.$route.params.id;
      const objetivo = arr.find(h => h.id === id);
      if (objetivo) {
        objetivo.history = objetivo.history || [];
        objetivo.historySorted = [...objetivo.history].sort((a,b) => b.localeCompare(a));
      }
      this.habito = objetivo || null;
      // reset confirm UI al cambiar de hábito
      this.mostrarConfirmEliminar = false;
    },
    marcarHoy() {
      if (!this.habito) return;
      const hoy = new Date().toISOString().slice(0,10);
      if (!this.habito.history.includes(hoy)) {
        // añadir hoy al historial y propagar cambios al almacen / storage
        this.habito.history.push(hoy);
        this.habito.historySorted = [...this.habito.history].sort((a,b) => b.localeCompare(a));
        const idx = almacen.habitos.findIndex(h => h.id === this.habito.id);
        if (idx !== -1) {
          // actualizar almacen reactivo
          almacen.habitos[idx] = { ...this.habito };
        } else {
          // fallback si el almacen no tiene el ítem (rare)
          const arr = this.cargarTodos();
          const i = arr.findIndex(h => h.id === this.habito.id);
          if (i !== -1) { arr[i] = this.habito; this.guardarTodos(arr); }
        }
        guardarEnLocalStorage();
        // limpiar cualquier mensaje previo
        this.mensajeError = '';
      } else {
        // mostrar mensaje rojo debajo del botón
        this.mensajeError = 'Ya marcaste este hábito hoy.';
        // quitar el mensaje después de X ms
        clearTimeout(this._msgTimer);
        this._msgTimer = setTimeout(() => { this.mensajeError = ''; }, 3500);
      }
    },

    /* ---- MÉTODOS PARA LA CONFIRMACIÓN EN LÍNEA EN LA PÁGINA DE DETALLE ---- */
    iniciarConfirmDetalle() {
      this.mostrarConfirmEliminar = true;
    },
    cancelarConfirmDetalle() {
      this.mostrarConfirmEliminar = false;
    },
    confirmarEliminarDetalle() {
      if (!this.habito) return;
      // proceder a eliminar igual que en la lista principal
      almacen.habitos = almacen.habitos.filter(h => h.id !== this.habito.id);
      guardarEnLocalStorage();
      this.mostrarConfirmEliminar = false;
      this.$router.push('/');
    }
  },
  beforeUnmount() {
    // limpiar timer si existe
    if (this._msgTimer) clearTimeout(this._msgTimer);
  }
};

/*RUTAS & MOUNT*/

const rutas = [
  { path: '/', component: RaizApp },
  { path: '/habit/:id', component: DetalleHabito, props: true }
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: rutas
});

// inicializa almacen desde storage
cargarDesdeLocalStorage();

// ROOT que renderiza <router-view/>
const app = Vue.createApp({ template: '<router-view></router-view>' });
app.use(router);
app.mount('#app');
