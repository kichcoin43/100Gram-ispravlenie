package com.telegram.messenger

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register plugins
        registerPlugin(com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin::class.java)
        registerPlugin(com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin::class.java)
    }
}
