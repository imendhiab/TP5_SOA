const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

console.log("🚀 Démarrage du serveur gRPC...");

// Chemin vers le fichier proto
const PROTO_PATH = path.join(__dirname, 'chat.proto');

// Chargement du fichier proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

// Définition d'un utilisateur administrateur
const admin = {
    id: "admin",
    name: "Grpc_Admin",
    email: "grpc_admin@mail.com",
    status: "ACTIVE",
};

// Stockage en mémoire des messages
const messageHistory = [];

// Implémentation de l'appel GetUser
function getUser(call, callback) {
    const userId = call.request.user_id;
    console.log(`Requête GetUser reçue pour id: ${userId}`);

    // Retourner un utilisateur fictif basé sur admin
    const user = { ...admin, id: userId };
    callback(null, { user });
}

// Implémentation de l'appel Chat (streaming bidirectionnel)
function chat(call) {
    console.log("Flux Chat démarré.");
    
    call.on('data', (chatStreamMessage) => {
        if (chatStreamMessage.chat_message) {
            const msg = chatStreamMessage.chat_message;
            console.log(`Message reçu de ${msg.sender_id}: ${msg.content}`);

            // Sauvegarde du message dans l'historique
            messageHistory.push(msg);

            // Réponse du serveur
            const reply = {
                id: msg.id + "_reply",
                room_id: msg.room_id,
                sender_id: admin.name,
                content: "received at " + new Date().toISOString(),
            };

            call.write({ chat_message: reply });
        }
    });

    call.on('end', () => {
        console.log("Fin du flux Chat.");
        call.end();
    });
}

// Implémentation de l'appel GetChatHistory
function getChatHistory(call, callback) {
    const roomId = call.request.room_id;
    console.log(`Requête d'historique pour la salle: ${roomId}`);

    // Filtrage des messages par room_id
    const history = messageHistory.filter(msg => msg.room_id === roomId);

    callback(null, { messages: history });
}

// Démarrage du serveur gRPC
function main() {
    console.log("🚀 Démarrage du serveur gRPC...");

    const server = new grpc.Server();
    server.addService(chatProto.ChatService.service, {
        GetUser: getUser,
        Chat: chat,
        GetChatHistory: getChatHistory
    });

    const address = '0.0.0.0:50051';
    console.log(`🛠️ Tentative de binding sur ${address}...`);
    
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error("❌ Erreur lors du binding du serveur :", error);
            return;
        }
        console.log(`✅ Serveur gRPC en écoute sur ${address}`);
    });
}

main();
