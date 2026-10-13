/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

import { channelTypes } from "../settings";
import type { Channel, Role, Settings } from "../types";
import { duration, snowflakeDate } from "../utils/date";
import type { Modules } from "../utils/modules";
import { ADMINISTRATOR, bits, memberCanView, overwrites, roleCanView, VIEW_CHANNEL } from "../utils/permissions";

import { HiddenChannelIcon } from "./HiddenChannelIcon";

function roleColor(role: Role): string | undefined {
    return role.color ? `#${role.color.toString(16).padStart(6, "0")}` : undefined;
}

export function Lockscreen({ channel, settings, modules }: { channel: Channel; settings: Settings; modules: Modules }) {
    const guild = modules.GuildStore.getGuild(channel.guild_id);
    const roles = modules.GuildRoleStore?.getRolesSnapshot(channel.guild_id) ?? guild?.roles ?? {};
    const ownerId = guild?.ownerId ?? guild?.owner_id;
    const rules = overwrites(channel);
    const allowedRoles = Object.values(roles)
        .filter(role => {
            const admin = !!(bits(role.permissions) & ADMINISTRATOR);
            if (admin && (settings.showAdmin === "never" || (settings.showAdmin === "exclude" && role.tags?.bot_id))) return false;
            if (admin && settings.showAdmin === "channel" && !rules.some(rule => rule.id === role.id && rule.type === 0)) return false;
            return roleCanView(channel, roles, channel.guild_id, role.id);
        })
        .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
    const members = rules
        .filter(rule => rule.type === 1)
        .map(rule => {
            const member = modules.GuildMemberStore?.getMember(channel.guild_id, rule.id);
            const known = !!member || rule.id === ownerId;
            const allowed = known
                ? memberCanView(channel, roles, channel.guild_id, rule.id, member?.roles ?? [], ownerId)
                : !!(bits(rule.allow) & VIEW_CHANNEL);
            return { rule, allowed, known };
        })
        .filter(member => member.allowed);
    const userName = (id: string) => {
        const user = modules.UserStore?.getUser(id);
        return user?.globalName ?? user?.username ?? id;
    };
    const forum = channel.type === 15 || channel.type === 16;
    const voice = channel.type === 2 || channel.type === 13;
    const typeName = channelTypes[channel.type]?.replace("GUILD_", "").toLowerCase() ?? "unknown";
    const details: [string, string | number | null | undefined][] = [
        ["Channel ID", channel.id],
        ["Category", modules.ChannelStore.getChannel(channel.parent_id ?? "")?.name],
        ["Created", snowflakeDate(channel.id)],
        ["Last message", settings.showLastMessage ? snowflakeDate(channel.lastMessageId ?? channel.last_message_id) : null],
        ["Last pin", channel.lastPinTimestamp ? new Date(channel.lastPinTimestamp).toLocaleString() : null],
        ["Age restricted", channel.nsfw ? "Yes" : "No"],
        ["Slowmode", duration(channel.rateLimitPerUser ?? channel.rate_limit_per_user ?? 0)],
        ["Icon emoji", channel.iconEmoji?.name ?? channel.iconEmoji?.id],
        ["Bitrate", voice && channel.bitrate ? `${channel.bitrate / 1000} kbps` : null],
        ["User limit", voice ? (channel.userLimit ?? channel.user_limit ?? "Unlimited") : null],
        ["Voice region", voice ? (channel.rtcRegion ?? "Automatic") : null],
        ["Video quality", voice ? (channel.videoQualityMode === 2 ? "720p" : "Automatic") : null],
        ["Default archive duration", channel.defaultAutoArchiveDuration ? duration(channel.defaultAutoArchiveDuration * 60) : null],
        ["Post slowmode", forum ? duration(channel.defaultThreadRateLimitPerUser ?? 0) : null],
        ["Post sort order", forum ? (channel.defaultSortOrder === 1 ? "Creation date" : "Latest activity") : null],
        ["Forum layout", forum ? ["Default", "List", "Gallery"][channel.defaultForumLayout ?? 0] : null],
        ["Tag required", forum ? ((channel.flags ?? 0) & 16 ? "Yes" : "No") : null],
        ["Default reaction", channel.defaultReactionEmoji?.emojiName ?? channel.defaultReactionEmoji?.emojiId]
    ];

    return (
        <section className={`shc-lockscreen ${modules.chatClass ?? ""}`} aria-label="Hidden channel information">
            <div className="shc-card">
                <HiddenChannelIcon icon={settings.hiddenChannelIcon} />
                <h1>#{channel.name}</h1>
                <p>
                    This is a hidden {typeName} channel. You do not have permission to view its contents{voice ? " or join it" : ""}.
                </p>
                {channel.topic && (
                    <div className="shc-topic">
                        <h2>{forum ? "Guidelines" : "Topic"}</h2>
                        <p>{channel.topic}</p>
                    </div>
                )}
                <dl className="shc-details">
                    {details
                        .filter(([, value]) => value !== null && value !== undefined)
                        .map(([label, value]) => (
                            <BdApi.React.Fragment key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                            </BdApi.React.Fragment>
                        ))}
                </dl>
                {!!channel.availableTags?.length && (
                    <div>
                        <h2>Available tags</h2>
                        <div className="shc-pills">
                            {channel.availableTags.map(tag => (
                                <span className="shc-pill" key={tag.id} title={tag.moderated ? "Moderated tag" : undefined}>
                                    {tag.emojiName} {tag.name}
                                    {tag.moderated && " 🔒"}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {settings.showPerms && (
                    <div className="shc-permissions">
                        <h2>Roles with access</h2>
                        <p className="shc-note">
                            Each role is evaluated with @everyone and channel overrides. Multiple roles can change a member’s access.
                        </p>
                        <div className="shc-pills">
                            {allowedRoles.length ? (
                                allowedRoles.map(role => (
                                    <span
                                        key={role.id}
                                        className="shc-pill"
                                        style={{ color: roleColor(role) }}
                                        title={bits(role.permissions) & ADMINISTRATOR ? "Administrator" : role.id}
                                    >
                                        {role.name}
                                        {!!(bits(role.permissions) & ADMINISTRATOR) && " · Admin"}
                                    </span>
                                ))
                            ) : (
                                <span>No matching roles in the local data.</span>
                            )}
                        </div>
                        <h2>Members with access</h2>
                        {ownerId && <p>Server owner: {userName(ownerId)}</p>}
                        <div className="shc-pills">
                            {members.length ? (
                                members.map(({ rule, known }) => (
                                    <span key={rule.id} className="shc-pill" title={rule.id}>
                                        {userName(rule.id)}
                                        {!known && " · Explicit allow"}
                                    </span>
                                ))
                            ) : (
                                <span>No matching member overrides.</span>
                            )}
                        </div>
                        <p className="shc-note">
                            Only locally available members and overrides are shown. Member details are never fetched.
                        </p>
                        <details>
                            <summary>Permission overrides ({rules.length})</summary>
                            <div className="shc-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Role or member</th>
                                            <th>View channel</th>
                                            <th>Allow bits</th>
                                            <th>Deny bits</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rules.map(rule => (
                                            <tr key={rule.id}>
                                                <td>{rule.type === 0 ? (roles[rule.id]?.name ?? rule.id) : userName(rule.id)}</td>
                                                <td>
                                                    {bits(rule.allow) & VIEW_CHANNEL
                                                        ? "Allow"
                                                        : bits(rule.deny) & VIEW_CHANNEL
                                                          ? "Deny"
                                                          : "Inherit"}
                                                </td>
                                                <td>{bits(rule.allow).toString()}</td>
                                                <td>{bits(rule.deny).toString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </div>
                )}
                <p className="shc-note">Channel information is limited to data Discord has already sent to your client.</p>
            </div>
        </section>
    );
}
