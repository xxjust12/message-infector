import { ReactNative as RN } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

const { FormSection, FormInput, FormRow } = Forms;
const { ScrollView, View, Text, TouchableOpacity, TextInput } = RN;

// Vendetta / Discord internals
const ChannelStore = findByStoreName("ChannelStore");
const UserStore = findByStoreName("UserStore");
const MessageStore = findByStoreName("MessageStore");
const FluxDispatcher = findByProps("dispatch", "subscribe");

// Initialize storage defaults
storage.targetUserId ??= "";
storage.senderUserId ??= "";
storage.messageContent ??= "";
storage.embedTitle ??= "";
storage.embedDescription ??= "";
storage.embedImageUrl ??= "";

// Function to inject a fake message
async function injectFakeMessage() {
    const targetUserId = (storage as any).targetUserId;
    const senderUserId = (storage as any).senderUserId;
    const messageContent = (storage as any).messageContent;
    const embedTitle = (storage as any).embedTitle;
    const embedDescription = (storage as any).embedDescription;
    const embedImageUrl = (storage as any).embedImageUrl;

    if (!targetUserId || !targetUserId.trim()) {
        RN.Alert.alert("Error", "Please enter a Target User ID!");
        return;
    }

    if (!senderUserId || !senderUserId.trim()) {
        RN.Alert.alert("Error", "Please enter a Sender User ID!");
        return;
    }

    if (!messageContent || !messageContent.trim()) {
        RN.Alert.alert("Error", "Please enter message content!");
        return;
    }

    try {
        // Find or create DM channel with target user
        let channelId = null;
        const privateChannels = ChannelStore.getSortedPrivateChannels();
        
        for (const channel of privateChannels) {
            if (channel.recipients && channel.recipients.some((r: any) => r.id === targetUserId)) {
                channelId = channel.id;
                break;
            }
        }

        if (!channelId) {
            // Generate a fake channel ID if no DM exists
            channelId = String(BigInt(Date.now()) * BigInt(4194304) + BigInt(Math.floor(Math.random() * 4194304)));
        }

        // Get sender user info
        const sender = UserStore.getUser(senderUserId);
        if (!sender) {
            RN.Alert.alert("Error", "Could not find sender user. Make sure the User ID is correct and you share a server with them!");
            return;
        }

        // Build embeds array
        const embeds: any[] = [];
        if (embedTitle || embedDescription || embedImageUrl) {
            const embed: any = {
                type: "rich",
                color: 0x5865F2,
            };
            if (embedTitle) embed.title = embedTitle;
            if (embedDescription) embed.description = embedDescription;
            if (embedImageUrl) embed.image = { url: embedImageUrl, proxy_url: embedImageUrl };
            embeds.push(embed);
        }

        // Create the fake message object
        const fakeMessage = {
            id: String(BigInt(Date.now()) * BigInt(4194304) + BigInt(Math.floor(Math.random() * 4194304))),
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

        // Dispatch the message to Discord
        FluxDispatcher.dispatch({
            type: "MESSAGE_CREATE",
            channelId: channelId,
            message: fakeMessage,
            optimistic: false,
            isPushNotification: false,
        });

        showToast("✅ Fake message sent!", 1); // 1 = success toast type

    } catch (error: any) {
        console.error("Message Injector Error:", error);
        RN.Alert.alert("Error", "Failed to inject message: " + (error?.message || "Unknown error"));
    }
}

// Quick test with current user
function sendQuickTest() {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) {
        RN.Alert.alert("Error", "Could not get current user!");
        return;
    }

    // Temporarily set values for quick test
    const originalTarget = (storage as any).targetUserId;
    const originalSender = (storage as any).senderUserId;
    const originalContent = (storage as any).messageContent;

    (storage as any).targetUserId = currentUser.id;
    (storage as any).senderUserId = currentUser.id;
    (storage as any).messageContent = "🧪 This is a quick test message from Message Injector!";

    injectFakeMessage();

    // Restore original values
    (storage as any).targetUserId = originalTarget;
    (storage as any).senderUserId = originalSender;
    (storage as any).messageContent = originalContent;
}

// Paste from clipboard helper
async function pasteFromClipboard(field: string) {
    try {
        const text = await RN.Clipboard.getString();
        if (text) {
            (storage as any)[field] = text;
            showToast("📋 Pasted!", 1);
        }
    } catch (e) {
        RN.Alert.alert("Error", "Failed to paste from clipboard");
    }
}

// Settings/UI Component
export function Settings() {
    useProxy(storage);

    const styles = RN.StyleSheet.create({
        container: {
            flex: 1,
        },
        section: {
            backgroundColor: "#2b2d31",
            borderRadius: 8,
            margin: 12,
            padding: 16,
        },
        sectionTitle: {
            color: "#b5bac1",
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.5,
            marginBottom: 8,
        },
        description: {
            color: "#949ba4",
            fontSize: 14,
            marginBottom: 12,
        },
        label: {
            color: "#b5bac1",
            fontSize: 14,
            fontWeight: "600",
            marginTop: 16,
            marginBottom: 4,
        },
        sublabel: {
            color: "#6d6f78",
            fontSize: 12,
            marginBottom: 8,
        },
        input: {
            backgroundColor: "#1e1f22",
            color: "#dbdee1",
            borderRadius: 4,
            padding: 12,
            fontSize: 16,
            borderWidth: 1,
            borderColor: "#3f4147",
        },
        multilineInput: {
            minHeight: 80,
            textAlignVertical: "top",
        },
        pasteButton: {
            backgroundColor: "#5865f2",
            borderRadius: 4,
            padding: 14,
            alignItems: "center",
            marginTop: 8,
        },
        sendButton: {
            backgroundColor: "#5865f2",
            borderRadius: 4,
            padding: 16,
            alignItems: "center",
            marginTop: 20,
        },
        testButton: {
            backgroundColor: "#f0a020",
            borderRadius: 4,
            padding: 16,
            alignItems: "center",
            marginTop: 10,
        },
        buttonText: {
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "600",
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
        },
        emoji: {
            fontSize: 16,
            marginRight: 8,
        },
    });

    return (
        <ScrollView style={styles.container}>
            {/* Header Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>MESSAGE FAKER</Text>
                <Text style={styles.description}>
                    💬 Inject fake messages into DMs from anyone.
                </Text>
            </View>

            {/* Create Fake Message Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CREATE FAKE MESSAGE</Text>
                <Text style={styles.description}>
                    📝 Create a fake message in someone's DM
                </Text>

                {/* Target User ID */}
                <Text style={styles.label}>TARGET USER ID (Whose DM)</Text>
                <Text style={styles.sublabel}>User ID of person whose DM you want to inject into</Text>
                <TextInput
                    style={styles.input}
                    value={(storage as any).targetUserId}
                    onChangeText={(text: string) => ((storage as any).targetUserId = text)}
                    placeholder="Enter Target User ID..."
                    placeholderTextColor="#4e5058"
                    keyboardType="numeric"
                />
                <TouchableOpacity 
                    style={styles.pasteButton} 
                    onPress={() => pasteFromClipboard("targetUserId")}
                >
                    <Text style={styles.buttonText}>📋 Paste Target User ID</Text>
                </TouchableOpacity>

                {/* Sender User ID */}
                <Text style={styles.label}>FROM USER ID (Who message is from)</Text>
                <Text style={styles.sublabel}>User ID of who the message appears to be from</Text>
                <TextInput
                    style={styles.input}
                    value={(storage as any).senderUserId}
                    onChangeText={(text: string) => ((storage as any).senderUserId = text)}
                    placeholder="Enter Sender User ID..."
                    placeholderTextColor="#4e5058"
                    keyboardType="numeric"
                />
                <TouchableOpacity 
                    style={styles.pasteButton} 
                    onPress={() => pasteFromClipboard("senderUserId")}
                >
                    <Text style={styles.buttonText}>📋 Paste Sender User ID</Text>
                </TouchableOpacity>

                {/* Message Content */}
                <Text style={styles.label}>MESSAGE CONTENT</Text>
                <Text style={styles.sublabel}>The message text</Text>
                <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={(storage as any).messageContent}
                    onChangeText={(text: string) => ((storage as any).messageContent = text)}
                    placeholder="Enter message text..."
                    placeholderTextColor="#4e5058"
                    multiline={true}
                />

                {/* Optional Embed */}
                <Text style={[styles.label, { marginTop: 24 }]}>🔗 Optional: Add an embed</Text>

                <Text style={styles.label}>EMBED TITLE</Text>
                <Text style={styles.sublabel}>Optional embed title</Text>
                <TextInput
                    style={styles.input}
                    value={(storage as any).embedTitle}
                    onChangeText={(text: string) => ((storage as any).embedTitle = text)}
                    placeholder="Optional embed title"
                    placeholderTextColor="#4e5058"
                />

                <Text style={styles.label}>EMBED DESCRIPTION</Text>
                <Text style={styles.sublabel}>Optional embed description</Text>
                <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={(storage as any).embedDescription}
                    onChangeText={(text: string) => ((storage as any).embedDescription = text)}
                    placeholder="Optional embed description"
                    placeholderTextColor="#4e5058"
                    multiline={true}
                />

                <Text style={styles.label}>EMBED IMAGE URL</Text>
                <Text style={styles.sublabel}>Optional image URL</Text>
                <TextInput
                    style={styles.input}
                    value={(storage as any).embedImageUrl}
                    onChangeText={(text: string) => ((storage as any).embedImageUrl = text)}
                    placeholder="Optional image URL"
                    placeholderTextColor="#4e5058"
                />

                {/* Send Button */}
                <TouchableOpacity style={styles.sendButton} onPress={injectFakeMessage}>
                    <Text style={styles.buttonText}>✉️ Send Fake Message</Text>
                </TouchableOpacity>

                {/* Quick Test Button */}
                <TouchableOpacity style={styles.testButton} onPress={sendQuickTest}>
                    <Text style={styles.buttonText}>✏️ Quick Test Message</Text>
                </TouchableOpacity>
            </View>

            {/* Console API Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CONSOLE API</Text>
                <Text style={styles.description}>
                    🔧 You can also use the console for advanced usage:{"\n\n"}
                    window.injectMessage()
                </Text>
            </View>
        </ScrollView>
    );
}

// Plugin entry point
export const onLoad = () => {
    // Expose to window for console access
    (window as any).injectMessage = injectFakeMessage;
    console.log("[Message Injector] Plugin loaded!");
};

export const onUnload = () => {
    // Cleanup
    delete (window as any).injectMessage;
    console.log("[Message Injector] Plugin unloaded!");
};

export const settings = Settings;

