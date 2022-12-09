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
    
    // groupIDを取得し、バッジ数を取得
    NSUserDefaults* notificationDefaults = [[NSUserDefaults alloc] initWithSuiteName:NOTIFICATIONEXT_GROUP_IDENTIFIER];
    NSString* badgeCountData = [notificationDefaults objectForKey:NOTIFICATIONEXT_GROUP_BADGE_KEY];
    // 現在のバッジ数に+1して設定
    NSInteger badgeCount = [badgeCountData length] == 0 ? 1 : [badgeCountData intValue] + 1;    
    self.bestAttemptContent.badge = [NSNumber numberWithInteger:badgeCount];
    // 現在のバッジ数を格納
    [notificationDefaults setObject:[NSString stringWithFormat:@"%ld", badgeCount] forKey:NOTIFICATIONEXT_GROUP_BADGE_KEY];
    
    self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    self.contentHandler(self.bestAttemptContent);
}

@end
