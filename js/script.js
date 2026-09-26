const piano = document.getElementById("piano");

// Volume inicial mais suave
const volumePad = new Tone.Volume(-18).toDestination();

// Reverb exclusivo do Pad
const reverbPad = new Tone.Reverb({
  decay: 5,
  wet: 0.35
}).connect(volumePad);

// Timbre Ambient Worship
const worshipPad = new Tone.PolySynth(
  Tone.Synth,
  {
    oscillator: {
      type: "fatsine",
      count: 3,
      spread: 12
    },

    envelope: {
      attack: 1.8,
      decay: 0.8,
      sustain: 0.65,
      release: 4
    }
  }
).connect(reverbPad);

let padAtivado = false;

const notas = [
    { nome: "Dó", midi: 60, tipo: "branca" },
    { nome: "Dó#", midi: 61, tipo: "preta" },
    { nome: "Ré", midi: 62, tipo: "branca" },
    { nome: "Ré#", midi: 63, tipo: "preta" },
    { nome: "Mi", midi: 64, tipo: "branca" },
    { nome: "Fá", midi: 65, tipo: "branca" },
    { nome: "Fá#", midi: 66, tipo: "preta" },
    { nome: "Sol", midi: 67, tipo: "branca" },
    { nome: "Sol#", midi: 68, tipo: "preta" },
    { nome: "Lá", midi: 69, tipo: "branca" },
    { nome: "Lá#", midi: 70, tipo: "preta" },
    { nome: "Si", midi: 71, tipo: "branca" },
    { nome: "Dó", midi: 72, tipo: "branca" }
];

// Efeito de reverberação
const reverb = new Tone.Reverb({
    decay: 3,
    wet: 0.25
}).toDestination();

// Amostras de piano
const volumePiano = new Tone.Volume(-10).toDestination();
const grandPiano = new Tone.Sampler({
    urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3"
    },

    baseUrl:
        "https://tonejs.github.io/audio/salamander/",

    release: 1,

    onload: () => {
        console.log("Piano carregado!");
    }
}).connect(volumePiano);

let audioIniciado = false;

async function iniciarAudio() {
    if (audioIniciado) return;

    try {
        await Tone.start();

        audioIniciado = true;

        console.log("Áudio liberado!");
    } catch (erro) {
        console.error("Erro no áudio:", erro);
    }
}

// Começar a tocar
function tocarNota(midi) {
    if (!grandPiano.loaded) return;

    const nota = Tone.Frequency(
        midi,
        "midi"
    ).toNote();

    grandPiano.triggerAttack(nota);

  if (padAtivado) {
    worshipPad.triggerAttack(nota);
}
}

// Parar de tocar
function pararNota(midi) {
    if (!grandPiano.loaded) return;

    const nota = Tone.Frequency(
        midi,
        "midi"
    ).toNote();

    grandPiano.triggerRelease(nota);
    worshipPad.triggerRelease(nota);
}

// Criar as teclas
notas.forEach(nota => {
    const tecla = document.createElement("button");

    tecla.className = nota.tipo;

    tecla.textContent =
        nota.tipo === "branca" ? nota.nome : "";

    tecla.addEventListener("pointerdown", evento => {
    evento.preventDefault();

    tecla.setPointerCapture(evento.pointerId);

    if (!audioIniciado) {
        console.log("Ative o piano primeiro!");
        return;
    }

    if (!grandPiano.loaded) {
        console.log("Piano ainda carregando...");
        return;
    }

    tocarNota(nota.midi);
});

    tecla.addEventListener(
        "pointerup",
        () => pararNota(nota.midi)
    );

    tecla.addEventListener(
        "pointercancel",
        () => pararNota(nota.midi)
    );

    tecla.addEventListener(
        "lostpointercapture",
        () => pararNota(nota.midi)
    );

    piano.appendChild(tecla);
});

const botaoAudio = document.getElementById("ativarAudio");

botaoAudio.addEventListener("click", async () => {
    await iniciarAudio();

    if (audioIniciado) {
        botaoAudio.textContent = "✓ Piano ativado";
        botaoAudio.style.background = "#166534";
    }
});

const controleVolume = document.getElementById("volumePiano");

controleVolume.addEventListener("input", () => {
    volumePiano.volume.value = Number(controleVolume.value);
});

const testePad = document.createElement("button");

testePad.textContent = "🎹 Testar Pad";

testePad.addEventListener("click", async () => {
    await iniciarAudio();

    worshipPad.triggerAttackRelease(
        ["C4", "E4", "G4"],
        5
    );
});

document.querySelector(".app").appendChild(testePad);

const controlePad = document.getElementById("volumePad");
const botaoPad = document.getElementById("ativarPad");

controlePad.addEventListener("input", () => {
    volumePad.volume.value = Number(controlePad.value);
});

botaoPad.addEventListener("change", () => {
    padAtivado = botaoPad.checked;

    console.log("Worship Pad:", padAtivado);

    if (!padAtivado) {
        worshipPad.releaseAll();
    }
});

const conectarMidi = document.getElementById("conectarMidi");
const statusMidi = document.getElementById("statusMidi");

let midiAccess = null;
const notasMidiAtivas = new Set();

async function iniciarMidi() {
    if (!navigator.requestMIDIAccess) {
        statusMidi.textContent =
            "Seu navegador não suporta Web MIDI.";
        return;
    }

    try {
        await iniciarAudio();

        midiAccess = await navigator.requestMIDIAccess();

        midiAccess.onstatechange = atualizarDispositivos;
        atualizarDispositivos();

    } catch (erro) {
        statusMidi.textContent =
            "Não foi possível acessar o MIDI.";

        console.error("Erro MIDI:", erro);
    }
}

function atualizarDispositivos() {
    const entradas = [...midiAccess.inputs.values()];

    if (entradas.length === 0) {
        statusMidi.textContent =
            "Conecte seu Yamaha pelo USB MIDI.";
        return;
    }

    entradas.forEach(entrada => {
        entrada.onmidimessage = receberMidi;
    });

    statusMidi.textContent =
        "Conectado: " + entradas.map(
            entrada => entrada.name
        ).join(", ");
}

function receberMidi(evento) {
    const [status, nota, velocidade] = evento.data;

    const comando = status & 0xF0;

    // Nota pressionada
    if (comando === 0x90 && velocidade > 0) {
        if (!notasMidiAtivas.has(nota)) {
            notasMidiAtivas.add(nota);
            tocarNota(nota);
        }
    }

    // Nota solta
    if (
        comando === 0x80 ||
        (comando === 0x90 && velocidade === 0)
    ) {
        notasMidiAtivas.delete(nota);
        pararNota(nota);
    }
}

conectarMidi.addEventListener("click", iniciarMidi);

const botaoPararTudo = document.getElementById("pararTudo");

botaoPararTudo.addEventListener("click", () => {
  grandPiano.releaseAll();
  worshipPad.releaseAll();
  notasMidiAtivas.clear();
});

// ===== AMBIENT ATMOSPHERE =====

const botaoAtmosfera =
  document.getElementById("ativarAtmosfera");

const controleAtmosfera =
  document.getElementById("volumeAtmosfera");

const volumeAtmosfera =
  new Tone.Volume(-20).toDestination();

const atmosfera = new Tone.Player({
  url: "sounds/pads/atmosfera.wav",
  loop: true,
  fadeIn: 1.5,
  fadeOut: 1.5
}).connect(volumeAtmosfera);

let atmosferaLigada = false;

botaoAtmosfera.addEventListener("click", async () => {
  try {
    await Tone.start();

    if (!atmosfera.loaded) {
      botaoAtmosfera.textContent = "Carregando...";
      await Tone.loaded();
    }

    if (atmosferaLigada) {
      atmosfera.stop();
      atmosferaLigada = false;
      botaoAtmosfera.textContent = "▶ Ativar atmosfera";
    } else {
      atmosfera.start();
      atmosferaLigada = true;
      botaoAtmosfera.textContent = "■ Desativar atmosfera";
    }
  } catch (erro) {
    console.error("Erro na atmosfera:", erro);
    botaoAtmosfera.textContent = "Erro ao carregar áudio";
  }
});

controleAtmosfera.addEventListener("input", () => {
  volumeAtmosfera.volume.value =
    Number(controleAtmosfera.value);
});
