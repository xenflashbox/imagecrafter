"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  CreditCard,
  User,
  Bell,
  Shield,
  Zap,
  Check,
  ChevronRight,
  ExternalLink,
  Download,
  Trash2,
  LogOut,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

// ============================================================================
// TYPES
// ============================================================================

interface Plan {
  id: string;
  name: string;
  price: number;
  images: number;
  features: string[];
  recommended?: boolean;
}

// ============================================================================
// DATA
// ============================================================================

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    images: 5,
    features: ["5 images/month", "Watermarked", "1K resolution", "Basic templates"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    images: 100,
    features: [
      "100 images/month",
      "No watermark",
      "Up to 2K resolution",
      "All templates",
      "Batch generation",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    images: 500,
    recommended: true,
    features: [
      "500 images/month",
      "Pro model access",
      "4K resolution",
      "Unlimited projects",
      "Character consistency",
      "Priority support",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: 49,
    images: 2000,
    features: [
      "2,000 images/month",
      "Everything in Pro",
      "API access",
      "Multiple seats",
      "Custom integrations",
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function SettingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"account" | "billing" | "usage">("billing");

  // Mock current plan - replace with actual subscription data
  const currentPlan = "free";
  const usage = {
    used: 3,
    limit: 5,
    periodEnd: "December 31, 2024",
  };

  const tabs = [
    { id: "billing", label: "Plan & Billing", icon: CreditCard },
    { id: "usage", label: "Usage", icon: Zap },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-light mb-1">Settings</h1>
          <p className="text-white/40">Manage your account and subscription</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm transition-all ${
                    activeTab === tab.id ? "text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Billing Tab */}
        {activeTab === "billing" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Current Plan */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium mb-1">Current Plan</h3>
                  <p className="text-sm text-white/40">
                    {currentPlan === "free" ? "You're on the free plan" : `Your ${currentPlan} subscription`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light">
                    ${plans.find((p) => p.id === currentPlan)?.price}
                    <span className="text-sm text-white/40">/mo</span>
                  </div>
                  <div className="text-xs text-white/40">Renews {usage.periodEnd}</div>
                </div>
              </div>

              {/* Usage Bar */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Images this month</span>
                  <span className="text-sm">
                    {usage.used} / {usage.limit}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(usage.used / usage.limit) * 100}%` }}
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div>
              <h3 className="font-medium mb-4">Available Plans</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {plans.map((plan) => {
                  const isCurrent = plan.id === currentPlan;

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-xl border p-6 transition-all ${
                        plan.recommended
                          ? "bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 border-violet-500/50"
                          : isCurrent
                            ? "bg-white/5 border-white/20"
                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                      }`}
                    >
                      {plan.recommended && (
                        <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full text-xs font-medium">
                          Recommended
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-lg">{plan.name}</h4>
                          <div className="text-2xl font-light mt-1">
                            ${plan.price}
                            <span className="text-sm text-white/40">/mo</span>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                            Current
                          </span>
                        )}
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                            <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-xl font-medium transition-all ${
                          isCurrent
                            ? "bg-white/5 text-white/30 cursor-not-allowed"
                            : plan.recommended
                              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                              : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        {isCurrent ? "Current Plan" : plan.price === 0 ? "Downgrade" : "Upgrade"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Billing Management */}
            {currentPlan !== "free" && (
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <h3 className="font-medium mb-4">Billing Management</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <span className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-white/40" />
                      Update payment method
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <span className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-white/40" />
                      Download invoices
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all text-red-400">
                    <span className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4" />
                      Cancel subscription
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Usage Tab */}
        {activeTab === "usage" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Usage Overview */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="text-sm text-white/40 mb-2">Images Generated</div>
                <div className="text-3xl font-light">{usage.used}</div>
                <div className="text-xs text-white/30 mt-1">of {usage.limit} this month</div>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="text-sm text-white/40 mb-2">Remaining</div>
                <div className="text-3xl font-light">{usage.limit - usage.used}</div>
                <div className="text-xs text-white/30 mt-1">images available</div>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="text-sm text-white/40 mb-2">Period Ends</div>
                <div className="text-lg font-light">{usage.periodEnd}</div>
                <div className="text-xs text-white/30 mt-1">usage resets then</div>
              </div>
            </div>

            {/* Usage History Placeholder */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="font-medium mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { date: "Dec 13", action: "Generated image", prompt: "A cozy coffee shop..." },
                  { date: "Dec 12", action: "Generated image", prompt: "Tech startup team..." },
                  { date: "Dec 11", action: "Generated image", prompt: "Friendly turtle character..." },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <div className="text-sm">{activity.action}</div>
                        <div className="text-xs text-white/40 truncate max-w-[200px]">
                          {activity.prompt}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-white/30">{activity.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="font-medium mb-4">Profile</h3>
              <div className="flex items-center gap-4">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-16 h-16",
                    },
                  }}
                />
                <div>
                  <div className="font-medium">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-sm text-white/40">{user?.emailAddresses[0]?.emailAddress}</div>
                  <button className="text-sm text-violet-400 hover:text-violet-300 mt-1">
                    Manage in Clerk →
                  </button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="font-medium mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-white/40" />
                    <div>
                      <div className="text-sm">Email notifications</div>
                      <div className="text-xs text-white/40">Get updates about your usage</div>
                    </div>
                  </div>
                  <button className="w-12 h-6 rounded-full bg-violet-500 relative">
                    <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="font-medium mb-4">Data & Privacy</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  <span className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-white/40" />
                    Export my data
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all text-red-400">
                  <span className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4" />
                    Delete account
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
