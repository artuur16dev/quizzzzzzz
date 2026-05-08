const PRESET = [];

const make = (id, title, topic, difficulty, unlockLevel, desc, questions) => ({
  id, title, topic, difficulty, unlockLevel, desc, questions
});

const q = {
  mcq: (text, options, correct, explain, image=null, video=null) =>
    ({ type:"mcq", text, options, correct, explain, image, video }),
  tf: (text, correct, explain, image=null, video=null) =>
    ({ type:"tf", text, correct, explain, image, video }),
  open: (text, answers, explain, image=null, video=null) =>
    ({ type:"open", text, answers, explain, image, video }),
};

const BANK = {
  "Cultura general": [
    q.mcq("Quants dies té una setmana?", ["5","6","7","8"], 2, "Una setmana té 7 dies."),
    q.tf("El Sol és una estrella.", true, "Sí, el Sol és una estrella."),
    q.mcq("Quants minuts té una hora?", ["30","45","60","90"], 2, "Una hora té 60 minuts."),
    q.mcq("Quin és el planeta més gran?", ["Terra","Mart","Júpiter","Venus"], 2, "Júpiter és el més gran."),
    q.open("Quants mesos té un any?", ["12","dotze"], "Un any té 12 mesos."),
    q.mcq("Quin oceà és el més gran?", ["Atlàntic","Índic","Pacífic","Àrtic"], 2, "El Pacífic és el més gran."),
    q.tf("El gel és aigua en estat sòlid.", true, "Sí, és H₂O sòlid."),
    q.mcq("Quina és la capital d'Espanya?", ["Barcelona","Madrid","Sevilla","València"], 1, "Madrid."),
    q.mcq("Quin instrument mesura la temperatura?", ["Baròmetre","Termòmetre","Anemòmetre","Altímetre"], 1, "Termòmetre."),
    q.open("Escriu 10 + 5", ["15","quinze"], "10 + 5 = 15.")
  ],
  "Història": [
    q.mcq("Capital de l'Imperi Romà?", ["Roma","Atenes","Cartago","Alexandria"], 0, "Roma era la capital."),
    q.tf("Els romans construïen aqüeductes.", true, "Sí, per transportar aigua."),
    q.mcq("1492 s’associa a…", ["Arribada a Amèrica","Primera Guerra Mundial","Internet","Revolució industrial"], 0, "Arribada a Amèrica."),
    q.mcq("La Revolució Industrial va començar sobretot a…", ["Regne Unit","Espanya","Grècia","Portugal"], 0, "Regne Unit."),
    q.open("Com s’anomena el moviment cultural del Renaixement centrat en l’humà?", ["humanisme"], "Humanisme."),
    q.mcq("La Primera Guerra Mundial va començar el…", ["1914","1814","1945","1901"], 0, "1914."),
    q.tf("La Segona Guerra Mundial va acabar el 1945.", true, "Sí, 1945."),
    q.mcq("Els Jocs Olímpics van néixer a…", ["Olympia","Roma","Paris","Londres"], 0, "A Olympia."),
    q.mcq("L'escriptura egípcia antiga s'anomena…", ["Cuneïforme","Jeroglífics","Rúnica","Braille"], 1, "Jeroglífics."),
    q.open("Com s’anomena el rei d’Egipte antic?", ["farao","faraó","el faraó"], "Faraó.")
  ],
  "Esports": [
    q.mcq("Quants jugadors hi ha a un equip de futbol al camp?", ["9","10","11","12"], 2, "11 jugadors."),
    q.tf("Un partit de futbol dura 90 minuts (sense afegit).", true, "90 + afegit."),
    q.mcq("Quants jugadors per equip al bàsquet al camp?", ["5","6","7","8"], 0, "5 jugadors."),
    q.tf("Un triple al bàsquet val 3 punts.", true, "Sí."),
    q.mcq("Una marató té aproximadament…", ["10 km","21 km","42 km","100 km"], 2, "42,195 km."),
    q.mcq("Amb què es juga al tennis?", ["Raqueta","Pal","Disc","Bastó"], 0, "Raqueta."),
    q.mcq("Un esport d’hivern:", ["Esquí","Voleibol","Tennis taula","Beisbol"], 0, "Esquí."),
    q.tf("Els Jocs Olímpics tenen edició d’hivern.", true, "Sí."),
    q.mcq("Els anells olímpics són…", ["3","4","5","6"], 2, "5 anells."),
    q.open("Com s’anomena la competició mundial de futbol? (2 paraules)", ["copa del mon","copa del món","mundial"], "Copa del Món / Mundial.")
  ],
  "Geografia": [
    q.mcq("Capital de França?", ["Paris","Roma","Londres","Berlin"], 0, "París."),
    q.mcq("Capital d'Itàlia?", ["Roma","Milà","Florència","Torí"], 0, "Roma."),
    q.mcq("Capital del Japó?", ["Kyoto","Tokyo","Osaka","Seül"], 1, "Tokyo."),
    q.tf("Brasil és a Amèrica del Sud.", true, "Sí."),
    q.mcq("Els Pirineus separen…", ["Espanya i França","Itàlia i França","Portugal i Espanya","Alemanya i Polònia"], 0, "Espanya i França."),
    q.mcq("Ocean entre Europa i Amèrica:", ["Índic","Atlàntic","Pacífic","Àrtic"], 1, "Atlàntic."),
    q.tf("La latitud va de nord a sud.", true, "Sí (la longitud és E-O)."),
    q.mcq("L’Equador és…", ["Un meridià","Un paral·lel","Un riu","Un país"], 1, "Paral·lel (latitud 0)."),
    q.open("Capital de Catalunya?", ["barcelona"], "Barcelona."),
    q.open("Nom de l’oceà més gran?", ["pacific","pacífic","ocea pacific","oceà pacífic"], "Oceà Pacífic.")
  ],
  "Ciència": [
    q.mcq("H₂O és…", ["Oxigen","Hidrogen","Aigua","CO2"], 2, "Aigua."),
    q.tf("La Terra gira al voltant del Sol.", true, "Sí."),
    q.mcq("Unitat de força:", ["Watt","Newton","Volt","Ohm"], 1, "Newton (N)."),
    q.mcq("Unitat d’energia:", ["Joule","Ampere","Kelvin","Pascal"], 0, "Joule (J)."),
    q.mcq("Quin és el planeta vermell?", ["Venus","Mart","Júpiter","Saturn"], 1, "Mart."),
    q.tf("Els electrons tenen càrrega negativa.", true, "Sí."),
    q.mcq("Símbol del ferro:", ["Fe","Fr","F","Fi"], 0, "Fe."),
    q.tf("El pH 7 és neutre.", true, "Sí."),
    q.open("Com s’anomena la nostra galàxia?", ["via lactia","via làctia","milky way"], "Via Làctia."),
    q.open("Com s’anomena la ciència dels éssers vius?", ["biologia"], "Biologia.")
  ],
  "Videojocs": [
    q.mcq("Mario és un personatge de…", ["Nintendo","Sony","Microsoft","Valve"], 0, "Nintendo."),
    q.tf("Minecraft és un videojoc.", true, "Sí."),
    q.mcq("Gènere de Tetris:", ["Puzzle","FPS","RPG","Carreres"], 0, "Puzzle."),
    q.tf("Un 'boss' és un enemic fort.", true, "Sí."),
    q.mcq("Fortnite és principalment…", ["Carreres","Battle Royale","Simulació","Puzzle"], 1, "Battle Royale."),
    q.mcq("FPS significa…", ["First Person Shooter","Fast Play System","Final Point Score","Full Power Speed"], 0, "First Person Shooter."),
    q.mcq("PlayStation és de…", ["Sony","Microsoft","Nintendo","Google"], 0, "Sony."),
    q.mcq("Xbox és de…", ["Sony","Microsoft","Nintendo","Valve"], 1, "Microsoft."),
    q.open("Com es diu la saga amb en Link?", ["zelda","the legend of zelda"], "The Legend of Zelda."),
    q.open("GG significa… (2 paraules)", ["good game","bon joc"], "GG = Good Game.")
  ],
  "Cinema": [
    q.mcq("Saga amb sabres làser:", ["Star Wars","Harry Potter","Rocky","Cars"], 0, "Star Wars."),
    q.mcq("A 'Toy Story' el cowboy es diu…", ["Woody","Buzz","Andy","Rex"], 0, "Woody."),
    q.tf("Pixar va fer 'Toy Story'.", true, "Sí."),
    q.mcq("Pel·li de dinosaures famosa:", ["Jurassic Park","Interstellar","Avatar","Up"], 0, "Jurassic Park."),
    q.mcq("Iron Man és…", ["Tony Stark","Bruce Wayne","Clark Kent","Peter Parker"], 0, "Tony Stark."),
    q.tf("Batman és de Marvel.", false, "Batman és de DC."),
    q.mcq("La princesa de gel és…", ["Elsa","Moana","Mulan","Jasmine"], 0, "Elsa (Frozen)."),
    q.mcq("Director de 'Inception':", ["Nolan","Spielberg","Tarantino","Scorsese"], 0, "Christopher Nolan."),
    q.open("Nom del ratolí més famós de Disney?", ["mickey","mickey mouse"], "Mickey Mouse."),
    q.open("Nom del personatge ogre verd?", ["shrek"], "Shrek.")
  ],
  "Música": [
    q.mcq("Instrument de percussió:", ["Guitarra","Bateria","Flauta","Violí"], 1, "Bateria."),
    q.tf("BPM mesura el tempo.", true, "Sí."),
    q.mcq("Instrument de vent:", ["Guitarra","Violí","Flauta","Bateria"], 2, "Flauta."),
    q.mcq("Un compàs 4/4 té…", ["4 pulsacions","2 pulsacions","8 pulsacions","1 pulsació"], 0, "4 pulsacions."),
    q.mcq("Un gènere musical:", ["Jazz","DNS","HTML","Router"], 0, "Jazz."),
    q.tf("Un acord major sol sonar més alegre que un menor.", true, "Percepció habitual."),
    q.open("Sigles de beats per minute?", ["bpm"], "BPM."),
    q.open("Nom del concurs europeu de cançons?", ["eurovisio","eurovisió"], "Eurovisió."),
    q.mcq("Instrument de corda:", ["Violí","Triangle","Timbals","Flauta"], 0, "Violí."),
    q.mcq("El tempo es mesura en…", ["BPM","KB","Volt","Lux"], 0, "BPM.")
  ],
  "Tecnologia": [
    q.mcq("CPU és…", ["Processador","Monitor","Teclat","Ratolí"], 0, "CPU = processador."),
    q.tf("RAM és memòria volàtil.", true, "Sí."),
    q.mcq("HTML s’usa per…", ["Estructura web","Fer cafè","Dibuixar circuits","Fer música"], 0, "Estructura web."),
    q.mcq("CSS s’usa per…", ["Estils","Virus","Hardware","GPS"], 0, "Estils."),
    q.mcq("DNS serveix per…", ["Resoldre noms a IP","Guardar fotos","Fer música","Bateries"], 0, "Resol noms a IP."),
    q.tf("192.168.x.x és rang privat habitual.", true, "Sí."),
    q.mcq("HTTPS és…", ["HTTP segur","Un joc","Una impressora","Un cable"], 0, "HTTP + TLS."),
    q.mcq("Phishing és…", ["Engany per robar dades","Antivirus","Un joc","Un cable"], 0, "Engany."),
    q.open("Nom del programari que xifra fitxers i demana rescat?", ["ransomware"], "Ransomware."),
    q.open("Plataforma de repositoris famosa (1 paraula)?", ["github"], "GitHub.")
  ],
  "Llengua": [
    q.mcq("Sinònim de 'ràpid'?", ["Lent","Veloç","Trist","Alt"], 1, "Veloç."),
    q.tf("Antònim de 'gran' és 'petit'.", true, "Sí."),
    q.mcq("Antònim de 'fred'?", ["Calent","Blau","Dalt","Això"], 0, "Calent."),
    q.mcq("Plural de 'llapis' en català:", ["llapis","llapissos","llapises","llapisos"], 0, "És invariable."),
    q.mcq("Quina és una vocal?", ["b","t","a","x"], 2, "La 'a'."),
    q.tf("'Per què' pot ser interrogatiu.", true, "Per què ho fas?"),
    q.mcq("Quina paraula està ben escrita?", ["aver","haver","habé","abé"], 1, "haver."),
    q.open("Escriu un sinònim de 'feliç'.", ["content","alegre","joios","feliç"], "Ex: content, alegre..."),
    q.open("Escriu una nota musical.", ["do","re","mi","fa","sol","la","si"], "Qualsevol nota és correcta."),
    q.mcq("Una conjunció és…", ["i","taula","vermell","córrer"], 0, "'i' és conjunció.")
  ]
};

const topics = Object.keys(BANK);

// 10 temas × 5 quizzes = 50 quizzes
for (const topic of topics) {
  const base = BANK[topic];
  for (let k = 1; k <= 5; k++) {
    const start = ((k - 1) * 2) % base.length;
    const questions = [
      base[(start + 0) % base.length],
      base[(start + 1) % base.length],
      base[(start + 2) % base.length],
      base[(start + 3) % base.length],
      base[(start + 4) % base.length],
    ].map(x => ({...x}));

    const difficulty = k <= 2 ? "easy" : (k === 3 ? "medium" : "hard");
    const unlockLevel = k <= 2 ? 1 : (k === 3 ? 2 : (k === 4 ? 4 : 5));

    PRESET.push(make(
      `${topic.toLowerCase().replace(/\s+/g,"_")}_${String(k).padStart(2,"0")}`,
      `${topic} ${String(k).padStart(2,"0")}`,
      topic,
      difficulty,
      unlockLevel,
      `Pack ${k}/5 de ${topic}.`,
      questions
    ));
  }
}