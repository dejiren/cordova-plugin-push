//
//  NotificationService.m
//  notificationExt
//
//  Created by dejiren-user on 2022/12/05.
//

#import "NotificationService.h"

@interface NotificationService ()

@property (nonatomic, strong) void (^contentHandler)(UNNotificationContent *contentToDeliver);
@property (nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request withContentHandler:(void (^)(UNNotificationContent * _Nonnull))contentHandler {
    self.contentHandler = contentHandler;
    self.bestAttemptContent = [request.content mutableCopy];
    
    // Modify the notification content here...
    self.bestAttemptContent.title = [NSString stringWithFormat:@"%@ [modified]", self.bestAttemptContent.title];

    // groupIDを取得し、バッジ数を取得
    NSUserDefaults* sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.com.wingarc.djr.djrclientrc"];
    NSString* appGroup = [sharedDefaults objectForKey:@"djr.app_group"];
    NSLog(@"appGroup: %@", appGroup);
    // 現在のバッジ数に+1して設定
    NSInteger badgeCount = [appGroup length] == 0 ? 1 : [appGroup intValue] + 1;    
    self.bestAttemptContent.badge = [NSNumber numberWithInteger:badgeCount];
    // 現在のバッジ数を格納
    [sharedDefaults setObject:[NSString stringWithFormat:@"%ld", badgeCount] forKey:@"djr.app_group"];
    
    self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    self.contentHandler(self.bestAttemptContent);
}

@end
