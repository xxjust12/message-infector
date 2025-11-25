let plugin = (() => {
    const { findByStoreName, findByProps } = vendetta.metro;
    const { React, ReactNative: RN } = vendetta.metro.common;
    const { Forms } = vendetta.ui.components;
    const { useProxy } = vendetta.storage;
    const { storage } = vendetta.plugin;
    const { showToast } = vendetta.ui.toasts;

    const { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, Clipboard, StyleSheet } = RN;

    // Discord internals
    const ChannelStore = findByStoreName("ChannelStore");
    const UserStore = findByStoreName("UserStore");
    const FluxDispatcher = findByProps("dispatch", "subscribe");

    // Initialize storage defaults
    if (storage.targetUserId === undefined) storage.targetUserId = "";
    if (storage.senderUserId === undefined) storage.senderUserId = "";
    if (storage.messageContent === undefined) storage.messageContent = "";
    if (storage.embedTitle === undefined) storage.embedTitle = "";
    if (storage.embedDescription === undefined) storage.embedDescription = "";
    if (storage.embedImageUrl === undefined) storage.embedImageUrl = "";

    // Function to inject a fake message
    async function injectFakeMessage() {
        const targetUserId = storage.targetUserId;
        const senderUserId = storage.senderUserId;
        const messageContent = storage.messageContent;
        const embedTitle = storage.embedTitle;
        const embedDescription = storage.embedDescription;
        const embedImageUrl = storage.embedImageUrl;

        if (!targetUserId || !targetUserId.trim()) {
            Alert.alert("Error", "Please enter a Target User ID!");
            return;
        }

        if (!senderUserId || !senderUserId.trim()) {
            Alert.alert("Error", "Please enter a Sender User ID!");
            return;
        }

        if (!messageContent || !messageContent.trim()) {
            Alert.alert("Error", "Please enter message content!");
            return;
        }

        try {
            let channelId = null;
            const privateChannels = ChannelStore.getSortedPrivateChannels();
            
            for (const channel of privateChannels) {
                if (channel.recipients && channel.recipients.some(r => r.id === targetUserId)) {
                    channelId = channel.id;
                    break;
                }
            }

            if (!channelId) {
                channelId = String(Date.now() * 4194304 + Math.floor(Math.random() * 4194304));
            }

            const sender = UserStore.getUser(senderUserId);
            if (!sender) {
                Alert.alert("Error", "Could not find sender user. Make sure the User ID is correct and you share a server with them!");
                return;
            }

            const embeds = [];
            if (embedTitle || embedDescription || embedImageUrl) {
                const embed = {
                    type: "rich",
                    color: 0x5865F2,
                };
                if (embedTitle) embed.title = embedTitle;
                if (embedDescription) embed.description = embedDescription;
                if (embedImageUrl) embed.image = { url: embedImageUrl, proxy_url: embedImageUrl };
                embeds.push(embed);
            }

            const fakeMessage = {
                id: String(Date.now() * 4194304 + Math.floor(Math.random() * 4194304)),
                type: 0,
                channel_id: channelId,
                author: {
                    id: sender.id,
                    username: sender.username,
                    discriminator: sender.discriminator || "0",
                    avatar: sender.avatar,
                    bot: sender.bot || false,
                    global_name: sender.globalName || sender.username,
                },
                content: messageContent,
                timestamp: new Date().toISOString(),
                edited_timestamp: null,
                tts: false,
                mention_everyone: false,
                mentions: [],
                mention_roles: [],
                attachments: [],
                embeds: embeds,
                pinned: false,
                flags: 0,
            };

            FluxDispatcher.dispatch({
                type: "MESSAGE_CREATE",
                channelId: channelId,
                message: fakeMessage,
                optimistic: false,
                isPushNotification: false,
            });

            showToast("✅ Fake message sent!", 1);

        } catch (error) {
            console.error("Message Injector Error:", error);
            Alert.alert("Error", "Failed to inject message: " + (error?.message || "Unknown error"));
        }
    }

    function sendQuickTest() {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) {
            Alert.alert("Error", "Could not get current user!");
            return;
        }

        const originalTarget = storage.targetUserId;
        const originalSender = storage.senderUserId;
        const originalContent = storage.messageContent;

        storage.targetUserId = currentUser.id;
        storage.senderUserId = currentUser.id;
        storage.messageContent = "🧪 This is a quick test message from Message Injector!";

        injectFakeMessage();

        storage.targetUserId = originalTarget;
        storage.senderUserId = originalSender;
        storage.messageContent = originalContent;
    }

    async function pasteFromClipboard(field) {
        try {
            const text = await Clipboard.getString();
            if (text) {
                storage[field] = text;
                showToast("📋 Pasted!", 1);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to paste from clipboard");
        }
    }

    const styles = StyleSheet.create({
        container: { flex: 1 },
        section: { backgroundColor: "#2b2d31", borderRadius: 8, margin: 12, padding: 16 },
        sectionTitle: { color: "#b5bac1", fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
        description: { color: "#949ba4", fontSize: 14, marginBottom: 12 },
        label: { color: "#b5bac1", fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 4 },
        sublabel: { color: "#6d6f78", fontSize: 12, marginBottom: 8 },
        input: { backgroundColor: "#1e1f22", color: "#dbdee1", borderRadius: 4, padding: 12, fontSize: 16, borderWidth: 1, borderColor: "#3f4147" },
        multilineInput: { minHeight: 80, textAlignVertical: "top" },
        pasteButton: { backgroundColor: "#5865f2", borderRadius: 4, padding: 14, alignItems: "center", marginTop: 8 },
        sendButton: { backgroundColor: "#5865f2", borderRadius: 4, padding: 16, alignItems: "center", marginTop: 20 },
        testButton: { backgroundColor: "#f0a020", borderRadius: 4, padding: 16, alignItems: "center", marginTop: 10 },
        buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
    });

    function Settings() {
        useProxy(storage);

        return React.createElement(ScrollView, { style: styles.container },
            React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.sectionTitle }, "MESSAGE FAKER"),
                React.createElement(Text, { style: styles.description }, "💬 Inject fake messages into DMs from anyone.")
            ),
            React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.sectionTitle }, "CREATE FAKE MESSAGE"),
                React.createElement(Text, { style: styles.description }, "📝 Create a fake message in someone's DM"),
                React.createElement(Text, { style: styles.label }, "TARGET USER ID (Whose DM)"),
                React.createElement(Text, { style: styles.sublabel }, "User ID of person whose DM you want to inject into"),
                React.createElement(TextInput, { style: styles.input, value: storage.targetUserId, onChangeText: (text) => { storage.targetUserId = text; }, placeholder: "Enter Target User ID...", placeholderTextColor: "#4e5058", keyboardType: "numeric" }),
                React.createElement(TouchableOpacity, { style: styles.pasteButton, onPress: () => pasteFromClipboard("targetUserId") }, React.createElement(Text, { style: styles.buttonText }, "📋 Paste Target User ID")),
                React.createElement(Text, { style: styles.label }, "FROM USER ID (Who message is from)"),
                React.createElement(Text, { style: styles.sublabel }, "User ID of who the message appears to be from"),
                React.createElement(TextInput, { style: styles.input, value: storage.senderUserId, onChangeText: (text) => { storage.senderUserId = text; }, placeholder: "Enter Sender User ID...", placeholderTextColor: "#4e5058", keyboardType: "numeric" }),
                React.createElement(TouchableOpacity, { style: styles.pasteButton, onPress: () => pasteFromClipboard("senderUserId") }, React.createElement(Text, { style: styles.buttonText }, "📋 Paste Sender User ID")),
                React.createElement(Text, { style: styles.label }, "MESSAGE CONTENT"),
                React.createElement(Text, { style: styles.sublabel }, "The message text"),
                React.createElement(TextInput, { style: [styles.input, styles.multilineInput], value: storage.messageContent, onChangeText: (text) => { storage.messageContent = text; }, placeholder: "Enter message text...", placeholderTextColor: "#4e5058", multiline: true }),
                React.createElement(Text, { style: [styles.label, { marginTop: 24 }] }, "🔗 Optional: Add an embed"),
                React.createElement(Text, { style: styles.label }, "EMBED TITLE"),
                React.createElement(Text, { style: styles.sublabel }, "Optional embed title"),
                React.createElement(TextInput, { style: styles.input, value: storage.embedTitle, onChangeText: (text) => { storage.embedTitle = text; }, placeholder: "Optional embed title", placeholderTextColor: "#4e5058" }),
                React.createElement(Text, { style: styles.label }, "EMBED DESCRIPTION"),
                React.createElement(Text, { style: styles.sublabel }, "Optional embed description"),
                React.createElement(TextInput, { style: [styles.input, styles.multilineInput], value: storage.embedDescription, onChangeText: (text) => { storage.embedDescription = text; }, placeholder: "Optional embed description", placeholderTextColor: "#4e5058", multiline: true }),
                React.createElement(Text, { style: styles.label }, "EMBED IMAGE URL"),
                React.createElement(Text, { style: styles.sublabel }, "Optional image URL"),
                React.createElement(TextInput, { style: styles.input, value: storage.embedImageUrl, onChangeText: (text) => { storage.embedImageUrl = text; }, placeholder: "Optional image URL", placeholderTextColor: "#4e5058" }),
                React.createElement(TouchableOpacity, { style: styles.sendButton, onPress: injectFakeMessage }, React.createElement(Text, { style: styles.buttonText }, "✉️ Send Fake Message")),
                React.createElement(TouchableOpacity, { style: styles.testButton, onPress: sendQuickTest }, React.createElement(Text, { style: styles.buttonText }, "✏️ Quick Test Message"))
            ),
            React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.sectionTitle }, "CONSOLE API"),
                React.createElement(Text, { style: styles.description }, "🔧 You can also use the console:\nwindow.injectMessage()")
            )
        );
    }

    return {
        onLoad: () => {
            window.injectMessage = injectFakeMessage;
            console.log("[Message Injector] Plugin loaded!");
        },
        onUnload: () => {
            delete window.injectMessage;
            console.log("[Message Injector] Plugin unloaded!");
        },
        settings: Settings
    };
})();

export default plugin;
export const onLoad = plugin.onLoad;
export const onUnload = plugin.onUnload;
export const settings = plugin.settings;
