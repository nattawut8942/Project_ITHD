using Microsoft.AspNetCore.SignalR;

namespace HelpDeskApi.Hubs;

/// <summary>
/// Equivalent of the Node app's socket.io server (createServer + new Server(...)).
/// Frontend swaps its socket.io-client connection for @microsoft/signalr and listens
/// for the "TicketsUpdated" event the same way it listened for 'tickets_updated'.
/// See FRONTEND_NOTES.md for the exact client-side change needed.
/// </summary>
public class TicketHub : Hub
{
}

/// <summary>Small helper so controllers can call one line, same as req.app.get('io')?.emit(...).</summary>
public static class TicketHubNotifier
{
    public static async Task NotifyTicketsUpdatedAsync(this IHubContext<TicketHub> hub) =>
        await hub.Clients.All.SendAsync("TicketsUpdated");
}
